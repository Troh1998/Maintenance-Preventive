const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireRole } = require('./auth');

// GET /api/equipments - Liste des équipements
router.get('/', authenticateToken, (req, res) => {
    try {
        const { type, status, search } = req.query;
        let query = 'SELECT * FROM equipments WHERE 1=1';
        const params = [];

        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        if (search) {
            query += ' AND (name LIKE ? OR model LIKE ? OR serial_number LIKE ? OR assigned_user LIKE ?)';
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam, searchParam);
        }

        query += ' ORDER BY created_at DESC';

        const equipments = db.prepare(query).all(...params);
        res.json(equipments);
    } catch (error) {
        console.error('Erreur liste équipements:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/equipments/:id - Détails d'un équipement
router.get('/:id', authenticateToken, (req, res) => {
    try {
        const equipment = db.prepare('SELECT * FROM equipments WHERE id = ?').get(req.params.id);

        if (!equipment) {
            return res.status(404).json({ error: 'Équipement non trouvé' });
        }

        // Récupérer les interventions associées
        const interventions = db.prepare(`
      SELECT i.*, u.full_name as technician_name
      FROM interventions i
      LEFT JOIN users u ON i.technician_id = u.id
      WHERE i.equipment_id = ?
      ORDER BY i.scheduled_date DESC
    `).all(req.params.id);

        res.json({ ...equipment, interventions });
    } catch (error) {
        console.error('Erreur détails équipement:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/equipments - Créer un équipement
router.post('/', authenticateToken, requireRole('admin', 'technicien'), (req, res) => {
    try {
        const {
            name, type, brand, model, serial_number,
            purchase_date, assignment_date, assigned_user,
            location, status, notes
        } = req.body;

        if (!name || !type || !purchase_date) {
            return res.status(400).json({ error: 'Champs requis manquants' });
        }

        const result = db.prepare(`
      INSERT INTO equipments (
        name, type, brand, model, serial_number,
        purchase_date, assignment_date, assigned_user,
        location, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            name, type, brand, model, serial_number,
            purchase_date, assignment_date, assigned_user,
            location, status || 'actif', notes
        );

        const equipmentId = result.lastInsertRowid;

        // Générer automatiquement les interventions préventives (2 fois par an)
        generatePreventiveInterventions(equipmentId, purchase_date);

        res.status(201).json({ id: equipmentId, message: 'Équipement créé avec succès' });
    } catch (error) {
        console.error('Erreur création équipement:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PUT /api/equipments/:id - Modifier un équipement
router.put('/:id', authenticateToken, requireRole('admin', 'technicien'), (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, type, brand, model, serial_number,
            purchase_date, assignment_date, assigned_user,
            location, status, notes
        } = req.body;

        db.prepare(`
      UPDATE equipments SET
        name = ?, type = ?, brand = ?, model = ?, serial_number = ?,
        purchase_date = ?, assignment_date = ?, assigned_user = ?,
        location = ?, status = ?, notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
            name, type, brand, model, serial_number,
            purchase_date, assignment_date, assigned_user,
            location, status, notes, id
        );

        res.json({ message: 'Équipement modifié avec succès' });
    } catch (error) {
        console.error('Erreur modification équipement:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE /api/equipments/:id - Supprimer un équipement
router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
    try {
        db.prepare('DELETE FROM equipments WHERE id = ?').run(req.params.id);
        res.json({ message: 'Équipement supprimé avec succès' });
    } catch (error) {
        console.error('Erreur suppression équipement:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Fonction pour générer les interventions préventives
function generatePreventiveInterventions(equipmentId, purchaseDate) {
    const currentYear = new Date().getFullYear();
    const purchaseMonth = new Date(purchaseDate).getMonth();

    // Calculer les 2 dates d'intervention (6 mois d'écart)
    const intervention1Month = purchaseMonth;
    const intervention2Month = (purchaseMonth + 6) % 12;

    // Créer les interventions pour l'année en cours et l'année suivante
    for (let year = currentYear; year <= currentYear + 1; year++) {
        const date1 = new Date(year, intervention1Month, 1);
        const date2 = new Date(year, intervention2Month, 1);

        // Ne créer que les interventions futures
        if (date1 > new Date()) {
            db.prepare(`
        INSERT INTO interventions (equipment_id, scheduled_date, type, status)
        VALUES (?, ?, 'verification', 'planifiee')
      `).run(equipmentId, date1.toISOString().split('T')[0]);
        }

        if (date2 > new Date()) {
            db.prepare(`
        INSERT INTO interventions (equipment_id, scheduled_date, type, status)
        VALUES (?, ?, 'verification', 'planifiee')
      `).run(equipmentId, date2.toISOString().split('T')[0]);
        }
    }
}

// GET /api/equipments/stats/summary - Statistiques des équipements
router.get('/stats/summary', authenticateToken, (req, res) => {
    try {
        const total = db.prepare('SELECT COUNT(*) as count FROM equipments').get().count;
        const byType = db.prepare('SELECT type, COUNT(*) as count FROM equipments GROUP BY type').all();
        const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM equipments GROUP BY status').all();

        res.json({ total, byType, byStatus });
    } catch (error) {
        console.error('Erreur stats équipements:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
