const nodemailer = require('nodemailer');
const { getPendingAlerts, markAlertAsSent } = require('./scheduler');

// Configuration du transporteur email
let transporter = null;

function initializeEmailTransporter() {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
        console.log('⚠️  Configuration email non définie - les notifications sont désactivées');
        return;
    }

    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || 587),
        secure: process.env.EMAIL_PORT === '465',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    console.log('✅ Service de notifications email initialisé');
}

// Envoyer les alertes en attente
async function sendPendingAlerts() {
    if (!transporter) {
        return;
    }

    try {
        const alerts = getPendingAlerts();

        for (const alert of alerts) {
            await sendInterventionAlert(alert);
            markAlertAsSent(alert.id);
        }

        if (alerts.length > 0) {
            console.log(`📧 ${alerts.length} alerte(s) envoyée(s)`);
        }
    } catch (error) {
        console.error('❌ Erreur envoi alertes:', error);
    }
}

// Envoyer une alerte pour une intervention
async function sendInterventionAlert(alert) {
    if (!transporter) {
        return;
    }

    const subject = `🔧 Intervention préventive à venir - ${alert.equipment_name}`;

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3788d8;">Intervention Préventive Planifiée</h2>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Équipement:</strong> ${alert.equipment_name}</p>
        <p><strong>Type:</strong> ${alert.equipment_type}</p>
        <p><strong>Date prévue:</strong> ${formatDate(alert.scheduled_date)}</p>
        <p><strong>Type d'intervention:</strong> ${formatInterventionType(alert.type)}</p>
      </div>
      
      <p>Cette intervention est planifiée dans les prochains jours. Merci de vous assurer de sa réalisation.</p>
      
      <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
        Ceci est un message automatique du système de maintenance préventive.
      </p>
    </div>
  `;

    const mailOptions = {
        from: process.env.EMAIL_FROM || 'Maintenance Préventive <noreply@maintenance.local>',
        to: alert.technician_email || process.env.EMAIL_USER,
        subject: subject,
        html: html
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('❌ Erreur envoi email:', error);
        throw error;
    }
}

// Envoyer une notification personnalisée
async function sendCustomNotification(to, subject, message) {
    if (!transporter) {
        console.log('⚠️  Notifications désactivées');
        return;
    }

    const mailOptions = {
        from: process.env.EMAIL_FROM || 'Maintenance Préventive <noreply@maintenance.local>',
        to: to,
        subject: subject,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3788d8;">Notification</h2>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          ${message}
        </div>
      </div>
    `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Notification envoyée à ${to}`);
    } catch (error) {
        console.error('❌ Erreur envoi notification:', error);
        throw error;
    }
}

// Formatage des dates
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Formatage des types d'intervention
function formatInterventionType(type) {
    const types = {
        'mise_a_jour': 'Mise à jour',
        'nettoyage': 'Nettoyage',
        'remplacement': 'Remplacement de pièce',
        'verification': 'Vérification',
        'autre': 'Autre'
    };
    return types[type] || type;
}

module.exports = {
    initializeEmailTransporter,
    sendPendingAlerts,
    sendInterventionAlert,
    sendCustomNotification
};
