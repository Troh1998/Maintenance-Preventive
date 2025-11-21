# Guide de Déploiement - Système de Maintenance Préventive

## Prérequis

- Docker et Docker Compose installés
- Serveur Linux (Ubuntu, Debian, CentOS, etc.)
- Port 3001 disponible

## Installation sur le Serveur Linux

### 1. Transférer les fichiers

Depuis votre machine Windows, transférez le dossier `maintenance-preventive` vers votre serveur :

```bash
# Option 1: Avec SCP
scp -r d:/Antigravity/maintenance-preventive adminsibm@VOTRE_IP:/opt/

# Option 2: Avec Git (si vous avez un dépôt)
cd /opt
git clone VOTRE_DEPOT maintenance-preventive
```

### 2. Se connecter au serveur

```bash
ssh adminsibm@VOTRE_IP
cd /opt/maintenance-preventive
```

### 3. Configurer les variables d'environnement (optionnel)

Créez un fichier `.env` pour personnaliser la configuration :

```bash
nano .env
```

Contenu du fichier `.env` :

```env
# Secret JWT (IMPORTANT: changez cette valeur !)
JWT_SECRET=votre_secret_jwt_super_securise_123456

# Configuration Email (optionnel pour les alertes)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application
EMAIL_FROM=Maintenance <noreply@maintenance.local>

# Alertes (nombre de jours avant l'intervention)
ALERT_DAYS_BEFORE=7
```

**Note**: Pour Gmail, utilisez un "mot de passe d'application" au lieu de votre mot de passe normal.

### 4. Construire et démarrer l'application

```bash
# Construire l'image Docker
sudo docker compose build

# Démarrer le conteneur
sudo docker compose up -d
```

### 5. Vérifier que tout fonctionne

```bash
# Vérifier que le conteneur tourne
sudo docker ps

# Voir les logs
sudo docker logs maintenance-preventive

# Logs en temps réel
sudo docker logs -f maintenance-preventive
```

### 6. Accéder à l'application

Ouvrez votre navigateur :
- **URL**: `http://VOTRE_IP_SERVEUR:3001`
- **Utilisateur par défaut**: `admin`
- **Mot de passe par défaut**: `admin123`

**⚠️ IMPORTANT**: Changez le mot de passe admin immédiatement après la première connexion !

## Commandes Utiles

### Gestion du conteneur

```bash
# Arrêter l'application
sudo docker compose down

# Redémarrer
sudo docker compose restart

# Voir les logs
sudo docker logs maintenance-preventive

# Accéder au shell du conteneur
sudo docker exec -it maintenance-preventive sh
```

### Mise à jour

```bash
# Arrêter le conteneur
sudo docker compose down

# Mettre à jour le code (si Git)
git pull

# Reconstruire et redémarrer
sudo docker compose build
sudo docker compose up -d
```

### Sauvegardes

La base de données SQLite est stockée dans `./data/maintenance.db`. Pour sauvegarder :

```bash
# Sauvegarde manuelle
tar -czf backup-maintenance-$(date +%Y%m%d).tar.gz data/

# Restauration
tar -xzf backup-maintenance-YYYYMMDD.tar.gz
```

### Sauvegarde automatique (cron)

```bash
# Éditer crontab
crontab -e

# Ajouter cette ligne pour une sauvegarde quotidienne à 2h du matin
0 2 * * * cd /opt/maintenance-preventive && tar -czf /backup/maintenance-$(date +\%Y\%m\%d).tar.gz data/
```

## Configuration Avancée

### Changer le port

Éditez `docker-compose.yml` :

```yaml
ports:
  - "8080:3001"  # Utilisez 8080 au lieu de 3001
```

Puis redémarrez :

```bash
sudo docker compose down
sudo docker compose up -d
```

### Reverse Proxy (Nginx)

Pour accéder via un nom de domaine (ex: maintenance.votredomaine.com) :

```nginx
server {
    listen 80;
    server_name maintenance.votredomaine.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL/HTTPS avec Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d maintenance.votredomaine.com
```

## Dépannage

### Le conteneur ne démarre pas

```bash
# Voir les logs d'erreur
sudo docker logs maintenance-preventive

# Vérifier les ports utilisés
sudo netstat -tulpn | grep 3001
```

### Port déjà utilisé

Changez le port dans `docker-compose.yml` (voir Configuration Avancée).

### Erreur de permissions

```bash
sudo chown -R 1000:1000 /opt/maintenance-preventive/data
```

### Réinitialiser la base de données

```bash
# ATTENTION: Ceci supprime toutes les données !
sudo docker compose down
rm -rf data/maintenance.db
sudo docker compose up -d
```

## Sécurité

### Recommandations

1. **Changez le mot de passe admin** immédiatement
2. **Changez JWT_SECRET** dans `.env`
3. **Utilisez HTTPS** en production (reverse proxy + SSL)
4. **Limitez l'accès** avec un firewall
5. **Sauvegardez régulièrement** la base de données

### Firewall (UFW)

```bash
# Autoriser seulement SSH et le port de l'application
sudo ufw allow 22/tcp
sudo ufw allow 3001/tcp
sudo ufw enable
```

## Support

Pour toute question ou problème, consultez les logs :

```bash
sudo docker logs -f maintenance-preventive
```
