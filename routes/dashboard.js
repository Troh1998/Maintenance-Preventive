const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('./auth');

// GET /api/dashboard/stats - Statistiques globales du tableau de bord
router.get('/stats', authenticateToken, (req, res) => {
    try {
        // Total équipements
        const totalEquipments = db.prepare('SELECT COUNT(*) as count FROM equipments').get().count;

        // Équipements actifs
        const activeEquipments = db.prepare(`
      SELECT COUNT(*) as count FROM equipments WHERE status = 'actif'
    `).get().count;

        // Total interventions
        const totalInterventions = db.prepare('SELECT COUNT(*) as count FROM interventions').get().count;

        // Interventions ce mois
        const thisMonth = new Date().toISOString().slice(0, 7);
        const interventionsThisMonth = db.prepare(`
      SELECT COUNT(*) as count FROM interventions 
      WHERE strftime('%Y-%m', scheduled_date) = ?
    `).get(thisMonth).count;

        // Interventions réalisées
        const completedInterventions = db.prepare(`
      SELECT COUNT(*) as count FROM interventions WHERE status = 'realisee'
    `).get().count;

        // Interventions en retard
        const overdueInterventions = db.prepare(`
      SELECT COUNT(*) as count FROM interventions 
      WHERE status = 'planifiee' AND scheduled_date < date('now')
    `).get().count;

        // Interventions à venir (7 prochains jours)
        const upcomingInterventions = db.prepare(`
      SELECT COUNT(*) as count FROM interventions 
      WHERE status = 'planifiee' 
      AND scheduled_date BETWEEN date('now') AND date('now', '+7 days')
    `).get().count;

        // Taux de maintenance effectuée
        const completionRate = totalInterventions > 0
            ? ((completedInterventions / totalInterventions) * 100).toFixed(1)
            : 0;

        res.json({
            equipments: {
                total: totalEquipments,
                active: activeEquipments
            },
            interventions: {
                total: totalInterventions,
                thisMonth: interventionsThisMonth,
                completed: completedInterventions,
                overdue: overdueInterventions,
                upcoming: upcomingInterventions,
                completionRate: parseFloat(completionRate)
            }
        });
    } catch (error) {
        console.error('Erreur stats dashboard:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/dashboard/charts/interventions-by-month - Interventions par mois
router.get('/charts/interventions-by-month', authenticateToken, (req, res) => {
    try {
        const { months = 6 } = req.query;

        const data = db.prepare(`
      SELECT 
        strftime('%Y-%m', scheduled_date) as month,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'realisee' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'planifiee' THEN 1 ELSE 0 END) as planned,
        SUM(CASE WHEN status = 'non_realisee' THEN 1 ELSE 0 END) as not_done
      FROM interventions
      WHERE scheduled_date >= date('now', '-' || ? || ' months')
      GROUP BY month
      ORDER BY month
    `).all(months);

        res.json(data);
    } catch (error) {
        console.error('Erreur chart interventions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/dashboard/charts/interventions-by-type - Interventions par type
router.get('/charts/interventions-by-type', authenticateToken, (req, res) => {
    try {
        const data = db.prepare(`
      SELECT type, COUNT(*) as count
      FROM interventions
      GROUP BY type
      ORDER BY count DESC
    `).all();

        res.json(data);
    } catch (error) {
        console.error('Erreur chart types:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/dashboard/charts/equipments-by-type - Équipements par type
router.get('/charts/equipments-by-type', authenticateToken, (req, res) => {
    try {
        const data = db.prepare(`
      SELECT type, COUNT(*) as count
      FROM equipments
      GROUP BY type
      ORDER BY count DESC
    `).all();

        res.json(data);
    } catch (error) {
        console.error('Erreur chart équipements:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/dashboard/recent-interventions - Interventions récentes
router.get('/recent-interventions', authenticateToken, (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const interventions = db.prepare(`
      SELECT i.*, 
             e.name as equipment_name, e.type as equipment_type,
             u.full_name as technician_name
      FROM interventions i
      LEFT JOIN equipments e ON i.equipment_id = e.id
      LEFT JOIN users u ON i.technician_id = u.id
      ORDER BY i.updated_at DESC
      LIMIT ?
    `).all(limit);

        res.json(interventions);
    } catch (error) {
        console.error('Erreur interventions récentes:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/dashboard/recurring-issues - Pannes récurrentes
router.get('/recurring-issues', authenticateToken, (req, res) => {
    try {
        const issues = db.prepare(`
      SELECT 
        e.id,
        e.name,
        e.type,
        e.model,
        COUNT(i.id) as intervention_count,
        SUM(CASE WHEN i.status = 'non_realisee' THEN 1 ELSE 0 END) as failed_count
      FROM equipments e
      LEFT JOIN interventions i ON e.id = i.equipment_id
      WHERE i.created_at >= date('now', '-6 months')
      GROUP BY e.id
      HAVING intervention_count > 2
      ORDER BY failed_count DESC, intervention_count DESC
      LIMIT 10
    `).all();

        res.json(issues);
    } catch (error) {
        console.error('Erreur pannes récurrentes:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
