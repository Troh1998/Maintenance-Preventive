// API Configuration
const API_URL = window.location.origin + '/api';

// Get auth token
function getToken() {
    return localStorage.getItem('token');
}

// Get current user
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getToken();
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// API Request helper
async function apiRequest(endpoint, options = {}) {
    const token = getToken();

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    });

    if (response.status === 401) {
        logout();
        return;
    }

    return response;
}

// Format date
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
}

// Format datetime
function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR');
}

// Get status badge HTML
function getStatusBadge(status) {
    const badges = {
        'planifiee': '<span class="badge badge-primary">Planifiée</span>',
        'en_cours': '<span class="badge badge-warning">En cours</span>',
        'realisee': '<span class="badge badge-success">Réalisée</span>',
        'non_realisee': '<span class="badge badge-danger">Non réalisée</span>',
        'annulee': '<span class="badge badge-gray">Annulée</span>',
        'actif': '<span class="badge badge-success">Actif</span>',
        'inactif': '<span class="badge badge-gray">Inactif</span>',
        'en_maintenance': '<span class="badge badge-warning">En maintenance</span>',
        'hors_service': '<span class="badge badge-danger">Hors service</span>'
    };
    return badges[status] || status;
}

// Get type label
function getTypeLabel(type) {
    const types = {
        'mise_a_jour': 'Mise à jour',
        'nettoyage': 'Nettoyage',
        'remplacement': 'Remplacement',
        'verification': 'Vérification',
        'autre': 'Autre',
        'ordinateur': 'Ordinateur',
        'imprimante': 'Imprimante',
        'reseau': 'Réseau',
        'peripherique': 'Périphérique',
        'serveur': 'Serveur'
    };
    return types[type] || type;
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'error' : 'success'}`;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    notification.style.animation = 'fadeInUp 0.3s ease';

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Protect page (redirect if not authenticated)
function protectPage() {
    if (!isAuthenticated()) {
        window.location.href = '/';
    }
}

// Initialize sidebar
function initSidebar() {
    const user = getCurrentUser();
    if (!user) return;

    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

    const sidebarHTML = `
        <div class="sidebar-header">
            <h2>🔧 Maintenance</h2>
            <p style="color: var(--gray-600); font-size: 0.875rem; margin-top: 0.5rem;">
                ${user.full_name || user.username}
                <br>
                <span style="font-size: 0.75rem;">${user.role}</span>
            </p>
        </div>
        <ul class="sidebar-nav">
            <li>
                <a href="/dashboard.html" class="${currentPage === 'dashboard.html' ? 'active' : ''}">
                    <span class="icon">📊</span>
                    Tableau de bord
                </a>
            </li>
            <li>
                <a href="/equipments.html" class="${currentPage === 'equipments.html' ? 'active' : ''}">
                    <span class="icon">💻</span>
                    Équipements
                </a>
            </li>
            <li>
                <a href="/interventions.html" class="${currentPage === 'interventions.html' ? 'active' : ''}">
                    <span class="icon">🔧</span>
                    Interventions
                </a>
            </li>
            <li>
                <a href="/calendar.html" class="${currentPage === 'calendar.html' ? 'active' : ''}">
                    <span class="icon">📅</span>
                    Calendrier
                </a>
            </li>
            <li>
                <a href="/reports.html" class="${currentPage === 'reports.html' ? 'active' : ''}">
                    <span class="icon">📈</span>
                    Rapports
                </a>
            </li>
            ${user.role === 'admin' ? `
            <li style="margin-top: 2rem; padding-top: 1rem; border-top: 2px solid var(--gray-100);">
                <a href="/users.html" class="${currentPage === 'users.html' ? 'active' : ''}">
                    <span class="icon">👥</span>
                    Utilisateurs
                </a>
            </li>
            ` : ''}
            <li style="margin-top: 1rem;">
                <a href="#" onclick="logout(); return false;">
                    <span class="icon">🚪</span>
                    Déconnexion
                </a>
            </li>
        </ul>
    `;

    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.innerHTML = sidebarHTML;
    }
}

// Check user role
function hasRole(...roles) {
    const user = getCurrentUser();
    return user && roles.includes(user.role);
}
