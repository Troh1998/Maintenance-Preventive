# Guide Utilisateur - Système de Maintenance Préventive

## Connexion

1. Accédez à l'application via votre navigateur
2. Utilisez vos identifiants fournis par l'administrateur
3. **Premier utilisateur**: `admin` / `admin123`

## Tableau de Bord

Le tableau de bord affiche :
- **Statistiques** : Nombre d'équipements, interventions, taux de réalisation
- **Alertes** : Interventions en retard et à venir
- **Graphiques** : Évolution des interventions, répartition des équipements
- **Interventions récentes** : Dernières activités
- **Équipements à surveiller** : Matériel nécessitant une attention particulière

## Gestion des Équipements

### Ajouter un équipement

1. Cliquez sur **"Équipements"** dans le menu
2. Cliquez sur **"+ Ajouter un équipement"**
3. Remplissez le formulaire :
   - **Nom** : Nom de l'équipement (requis)
   - **Type** : Ordinateur, Imprimante, Réseau, etc. (requis)
   - **Date d'achat** : Date d'acquisition (requis)
   - **Utilisateur affecté** : Nom de l'utilisateur
   - Autres champs optionnels
4. Cliquez sur **"Enregistrer"**

**Important** : Les interventions préventives sont automatiquement créées (2 fois/an) basées sur la date d'achat.

### Modifier un équipement

1. Trouvez l'équipement dans la liste
2. Cliquez sur **"Modifier"**
3. Modifiez les informations
4. Cliquez sur **"Enregistrer"**

### Rechercher un équipement

Utilisez la barre de recherche pour filtrer par nom, modèle ou utilisateur.

## Gestion des Interventions

### Voir les interventions

1. Cliquez sur **"Interventions"** dans le menu
2. Filtrez par statut si nécessaire
3. Consultez la liste des interventions planifiées

### Changer le statut d'une intervention

**Interventions planifiées** :
- Cliquez sur **"Démarrer"** pour passer en "En cours"
- Cliquez sur **"Non réalisée"** si l'intervention n'a pas pu être effectuée

**Interventions en cours** :
- Cliquez sur **"Terminer"** pour marquer comme réalisée

### Statuts disponibles

- 🔵 **Planifiée** : Intervention programmée
- 🟡 **En cours** : Intervention en cours de réalisation
- 🟢 **Réalisée** : Intervention terminée avec succès
- 🔴 **Non réalisée** : Intervention non effectuée
- ⚫ **Annulée** : Intervention annulée

## Calendrier

Le calendrier affiche toutes les interventions de manière visuelle :
- **Vue mensuelle** : Vue d'ensemble du mois
- **Vue hebdomadaire** : Détails de la semaine
- **Vue liste** : Liste chronologique

Cliquez sur une intervention pour voir les détails.

## Rapports

Consultez les statistiques et générez des rapports sur :
- Interventions réalisées par période
- Taux de maintenance effectuée
- Équipements nécessitant le plus d'interventions

## Gestion des Utilisateurs (Admin uniquement)

Les administrateurs peuvent :
- Créer de nouveaux utilisateurs
- Modifier les rôles (admin, technicien, lecture)
- Supprimer des utilisateurs

### Rôles

- **Admin** : Accès complet, gestion des utilisateurs
- **Technicien** : Gestion des équipements et interventions
- **Lecture** : Consultation uniquement

## Alertes et Notifications

Le système envoie automatiquement des alertes email :
- **7 jours avant** une intervention planifiée
- Pour les interventions non réalisées

*Configuration requise par l'administrateur système.*

## Bonnes Pratiques

1. **Enregistrez tous les équipements** dès leur acquisition
2. **Mettez à jour les statuts** des interventions en temps réel
3. **Consultez régulièrement** le tableau de bord
4. **Surveillez les alertes** d'interventions en retard
5. **Documentez les observations** dans les notes d'intervention

## Maintenance Préventive Automatique

Le système génère automatiquement :
- **2 interventions par an** par équipement
- Basées sur la **date d'anniversaire** de l'achat
- Planification **6 mois d'écart**

Exemple : Équipement acheté le 15 mars
- Intervention 1 : 15 mars de chaque année
- Intervention 2 : 15 septembre de chaque année

## Support

En cas de problème, contactez votre administrateur système.
