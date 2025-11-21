const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireRole } = require('./auth');

// GET /api/interventions - Liste des interventions
router.get('/', authenticateToken, (req, res) => {
    try {
        const { status, type, equipment_id, start_date, end_date } = req.query;
        let query = `
      SELECT i.*, 
             e.name as equipment_name, e.type as equipment_type,
             u.full_name as technician_name
      FROM interventions i
      LEFT JOIN equipments e ON i.equipment_id = e.id
      LEFT JOIN users u ON i.technician_id = u.id
      WHERE 1=1
    `;
        const params = [];

        if (status) {
            query += ' AND i.status = ?';
            params.push(status);
        }

        if (type) {
            query += ' AND i.type = ?';
            params.push(type);
        }

        if (equipment_id) {
            query += ' AND i.equipment_id = ?';
            params.push(equipment_id);
        }

        if (start_date) {
            query += ' AND i.scheduled_date >= ?';
            params.push(start_date);
        }

        if (end_date) {
            query += ' AND i.scheduled_date <= ?';
            params.push(end_date);
        }

        query += ' ORDER BY i.scheduled_date DESC';

        const interventions = db.prepare(query).all(...params);
        res.json(interventions);
    } catch (error) {
        console.error('Erreur liste interventions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/interventions/calendar - Interventions pour le calendrier
router.get('/calendar', authenticateToken, (req, res) => {
    try {
        const { start, end } = req.query;

        const interventions = db.prepare(`
      SELECT i.id, i.scheduled_date as date, i.status, i.type,
             e.name as title, e.type as equipment_type
      FROM interventions i
      LEFT JOIN equipments e ON i.equipment_id = e.id
      WHERE i.scheduled_date BETWEEN ? AND ?
      ORDER BY i.scheduled_date
    `).all(start, end);

        // Formater pour FullCalendar
        const events = interventions.map(i => ({
            id: i.id,
            title: i.title,
            start: i.date,
            backgroundColor: getStatusColor(i.status),
            extendedProps: {
                type: i.type,
                status: i.status,
                equipment_type: i.equipment_type
            }
        }));

        res.json(events);
    } catch (error) {
        console.error('Erreur calendrier:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/interventions/:id - Détails d'une intervention
router.get('/:id', authenticateToken, (req, res) => {
    try {
        const intervention = db.prepare(`
      SELECT i.*, 
             e.name as equipment_name, e.type as equipment_type,
             e.model, e.serial_number,
             u.full_name as technician_name
      FROM interventions i
      LEFT JOIN equipments e ON i.equipment_id = e.id
      LEFT JOIN users u ON i.technician_id = u.id
      WHERE i.id = ?
    `).get(req.params.id);

        if (!intervention) {
            return res.status(404).json({ error: 'Intervention non trouvée' });
        }

        res.json(intervention);
    } catch (error) {
        console.error('Erreur détails intervention:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/interventions - Créer une intervention
router.post('/', authenticateToken, requireRole('admin', 'technicien'), (req, res) => {
    try {
        const {
            equipment_id, scheduled_date, type, status, notes
        } = req.body;

        if (!equipment_id || !scheduled_date || !type) {
            return res.status(400).json({ error: 'Champs requis manquants' });
        }

        const result = db.prepare(`
      INSERT INTO interventions (equipment_id, scheduled_date, type, status, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(equipment_id, scheduled_date, type, status || 'planifiee', notes);

        res.status(201).json({ id: result.lastInsertRowid, message: 'Intervention créée avec succès' });
    } catch (error) {
        console.error('Erreur création intervention:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PUT /api/interventions/:id - Modifier une intervention
router.put('/:id', authenticateToken, requireRole('admin', 'technicien'), (req, res) => {
    try {
        const { id } = req.params;
        const {
            scheduled_date, start_time, end_time, type, status,
            notes, observations, technician_id
        } = req.body;

        db.prepare(`
      UPDATE interventions SET
        scheduled_date = COALESCE(?, scheduled_date),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        type = COALESCE(?, type),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        observations = COALESCE(?, observations),
        technician_id = COALESCE(?, technician_id),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(scheduled_date, start_time, end_time, type, status, notes, observations, technician_id, id);

        res.json({ message: 'Intervention modifiée avec succès' });
    } catch (error) {
        console.error('Erreur modification intervention:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PATCH /api/interventions/:id/status - Changer le statut d'une intervention
router.patch('/:id/status', authenticateToken, requireRole('admin', 'technicien'), (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Statut requis' });
        }

        const updates = { status };

        // Si on démarre l'intervention, enregistrer l'heure de début
        if (status === 'en_cours' && !db.prepare('SELECT start_time FROM interventions WHERE id = ?').get(id).start_time) {
            updates.start_time = new Date().toISOString();
        }

        // Si on termine l'intervention, enregistrer l'heure de fin
        if (status === 'realisee') {
            updates.end_time = new Date().toISOString();
            if (!db.prepare('SELECT start_time FROM interventions WHERE id = ?').get(id).start_time) {
                updates.start_time = new Date().toISOString();
            }
        }

        let query = 'UPDATE interventions SET status = ?, updated_at = CURRENT_TIMESTAMP';
        const params = [status];

        if (updates.start_time) {
            query += ', start_time = ?';
            params.push(updates.start_time);
        }

        if (updates.end_time) {
            query += ', end_time = ?';
            params.push(updates.end_time);
        }

        query += ' WHERE id = ?';
        params.push(id);

        db.prepare(query).run(...params);

        res.json({ message: 'Statut mis à jour avec succès' });
    } catch (error) {
        console.error('Erreur changement statut:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE /api/interventions/:id - Supprimer une intervention
router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
    try {
        db.prepare('DELETE FROM interventions WHERE id = ?').run(req.params.id);
        res.json({ message: 'Intervention supprimée avec succès' });
    } catch (error) {
        console.error('Erreur suppression intervention:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/interventions/stats/summary - Statistiques des interventions
router.get('/stats/summary', authenticateToken, (req, res) => {
    try {
        const total = db.prepare('SELECT COUNT(*) as count FROM interventions').get().count;
        const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM interventions GROUP BY status').all();
        const byType = db.prepare('SELECT type, COUNT(*) as count FROM interventions GROUP BY type').all();

        const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const thisMonthCount = db.prepare(`
      SELECT COUNT(*) as count FROM interventions 
      WHERE strftime('%Y-%m', scheduled_date) = ?
    `).get(thisMonth).count;

        const completed = db.prepare(`
      SELECT COUNT(*) as count FROM interventions WHERE status = 'realisee'
    `).get().count;

        const pending = db.prepare(`
      SELECT COUNT(*) as count FROM interventions 
      WHERE status = 'planifiee' AND scheduled_date < date('now')
    `).get().count;

        res.json({
            total,
            byStatus,
            byType,
            thisMonth: thisMonthCount,
            completed,
            pending,
            completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0
        });
    } catch (error) {
        console.error('Erreur stats interventions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Fonction helper pour les couleurs du calendrier
function getStatusColor(status) {
    const colors = {
        'planifiee': '#3788d8',
        'en_cours': '#f59e0b',
        'realisee': '#10b981',
        'non_realisee': '#ef4444',
        'annulee': '#6b7280'
    };
    return colors[status] || '#6b7280';
}

module.exports = router;
