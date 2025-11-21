require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Importer les routes
const { router: authRouter } = require('./routes/auth');
const equipmentsRouter = require('./routes/equipments');
const interventionsRouter = require('./routes/interventions');
const dashboardRouter = require('./routes/dashboard');

// Importer les services
const { startScheduler } = require('./services/scheduler');
const { initializeEmailTransporter, sendPendingAlerts } = require('./services/notifications');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes API
app.use('/api/auth', authRouter);
app.use('/api/equipments', equipmentsRouter);
app.use('/api/interventions', interventionsRouter);
app.use('/api/dashboard', dashboardRouter);

// Route de santé
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Servir le frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error('Erreur:', err);
    res.status(500).json({ error: 'Erreur serveur interne' });
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🔧 Système de Maintenance Préventive Informatique      ║
║                                                           ║
║   Serveur démarré sur: http://localhost:${PORT}            ║
║                                                           ║
║   Utilisateur par défaut:                                ║
║   - Username: admin                                       ║
║   - Password: admin123                                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);

    // Initialiser les services
    initializeEmailTransporter();
    startScheduler();

    // Envoyer les alertes en attente toutes les heures
    setInterval(() => {
        sendPendingAlerts();
    }, 60 * 60 * 1000); // 1 heure

    // Envoyer les alertes au démarrage
    setTimeout(() => {
        sendPendingAlerts();
    }, 5000);
});

module.exports = app;
