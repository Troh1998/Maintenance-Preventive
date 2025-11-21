const cron = require('node-cron');
const db = require('../database');

// Planification automatique des interventions préventives
// S'exécute tous les jours à minuit
function startScheduler() {
    console.log('🕐 Scheduler démarré');

    // Vérifier et créer les interventions préventives chaque jour à minuit
    cron.schedule('0 0 * * *', () => {
        console.log('⏰ Vérification des interventions préventives...');
        generateMissingInterventions();
    });

    // Créer les alertes pour les interventions à venir (tous les jours à 8h)
    cron.schedule('0 8 * * *', () => {
        console.log('🔔 Création des alertes...');
        createAlerts();
    });

    // Exécution immédiate au démarrage
    generateMissingInterventions();
    createAlerts();
}

// Générer les interventions manquantes pour tous les équipements
function generateMissingInterventions() {
    try {
        const equipments = db.prepare('SELECT * FROM equipments WHERE status = "actif"').all();

        let created = 0;

        equipments.forEach(equipment => {
            const purchaseDate = new Date(equipment.purchase_date);
            const purchaseMonth = purchaseDate.getMonth();

            // Calculer les 2 mois d'intervention (basé sur l'anniversaire)
            const intervention1Month = purchaseMonth;
            const intervention2Month = (purchaseMonth + 6) % 12;

            const currentYear = new Date().getFullYear();
            const nextYear = currentYear + 1;

            // Créer les interventions pour cette année et l'année prochaine
            for (let year = currentYear; year <= nextYear; year++) {
                const dates = [
                    new Date(year, intervention1Month, 1),
                    new Date(year, intervention2Month, 1)
                ];

                dates.forEach(date => {
                    // Ne créer que les interventions futures
                    if (date > new Date()) {
                        const dateStr = date.toISOString().split('T')[0];

                        // Vérifier si l'intervention existe déjà
                        const exists = db.prepare(`
              SELECT COUNT(*) as count FROM interventions 
              WHERE equipment_id = ? AND scheduled_date = ?
            `).get(equipment.id, dateStr);

                        if (exists.count === 0) {
                            db.prepare(`
                INSERT INTO interventions (equipment_id, scheduled_date, type, status)
                VALUES (?, ?, 'verification', 'planifiee')
              `).run(equipment.id, dateStr);
                            created++;
                        }
                    }
                });
            }
        });

        if (created > 0) {
            console.log(`✅ ${created} intervention(s) préventive(s) créée(s)`);
        }
    } catch (error) {
        console.error('❌ Erreur génération interventions:', error);
    }
}

// Créer des alertes pour les interventions à venir
function createAlerts() {
    try {
        const alertDaysBefore = parseInt(process.env.ALERT_DAYS_BEFORE || 7);

        // Trouver les interventions dans les N prochains jours sans alerte
        const interventions = db.prepare(`
      SELECT i.id, i.scheduled_date
      FROM interventions i
      LEFT JOIN alerts a ON i.id = a.intervention_id
      WHERE i.status = 'planifiee'
        AND i.scheduled_date BETWEEN date('now') AND date('now', '+' || ? || ' days')
        AND a.id IS NULL
    `).all(alertDaysBefore);

        let created = 0;

        interventions.forEach(intervention => {
            const alertDate = new Date();
            alertDate.setDate(alertDate.getDate() - alertDaysBefore);

            db.prepare(`
        INSERT INTO alerts (intervention_id, alert_date, sent)
        VALUES (?, date('now'), 0)
      `).run(intervention.id);

            created++;
        });

        if (created > 0) {
            console.log(`🔔 ${created} alerte(s) créée(s)`);
        }
    } catch (error) {
        console.error('❌ Erreur création alertes:', error);
    }
}

// Récupérer les alertes non envoyées
function getPendingAlerts() {
    try {
        return db.prepare(`
      SELECT a.*, i.scheduled_date, i.type,
             e.name as equipment_name, e.type as equipment_type,
             u.email as technician_email
      FROM alerts a
      JOIN interventions i ON a.intervention_id = i.id
      JOIN equipments e ON i.equipment_id = e.id
      LEFT JOIN users u ON i.technician_id = u.id
      WHERE a.sent = 0
    `).all();
    } catch (error) {
        console.error('❌ Erreur récupération alertes:', error);
        return [];
    }
}

// Marquer une alerte comme envoyée
function markAlertAsSent(alertId) {
    try {
        db.prepare(`
      UPDATE alerts SET sent = 1, sent_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(alertId);
    } catch (error) {
        console.error('❌ Erreur marquage alerte:', error);
    }
}

module.exports = {
    startScheduler,
    generateMissingInterventions,
    createAlerts,
    getPendingAlerts,
    markAlertAsSent
};
