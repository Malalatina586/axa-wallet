# AXE Admin Panel

Panneau d'administration pour AXE Wallet - Gestion des dépôts, retraits, utilisateurs et configuration.

## 🚀 Démarrage

### Localement

```bash
npm start
# Ouvre sur http://localhost:3001
```

### Déploiement Netlify

1. Poussez les changements sur GitHub
2. Netlify redéployera automatiquement

## 🔐 Identifiants de test

- **Email** : `admin@axe.mg`
- **Mot de passe** : `admin123`

## 📋 Fonctionnalités

- **Dashboard** : Vue d'ensemble des statistiques
- **Dépôts** : Approuver/Rejeter les dépôts utilisateurs
- **Retraits** : Gérer les retraits Mvola
- **Transactions** : Historique complet
- **Utilisateurs** : Gestion des comptes
- **Config** : Frais et taux de change

## 🔗 Intégration Supabase

Le panel utilise Supabase pour les données. Configurez vos clés dans le code :

```javascript
const SUPABASE_URL = 'https://...'
const SUPABASE_KEY = '...'
```

## 📁 Structure

```
axe-admin/
├── index.html       # Page principale (HTML + CSS + JS)
├── package.json     # Configuration npm
└── README.md        # Ce fichier
```

## 🔄 Synchronisation avec axa-wallet

Les deux projets partagent la même base Supabase. Les changements de frais/taux dans l'admin se reflètent immédiatement dans l'app.
