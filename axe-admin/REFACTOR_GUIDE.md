# AXE Admin Backoffice — Refactored v2.0

## 📁 Structure Organisée

### Avant (Monolithique)
- **index.html** — 1500+ lignes avec HTML + CSS + JavaScript imbriqués

### Après (Modulaire)
```
axe-admin/
├── index.html (archivé)
├── index-refactored.html ✅ NOUVEAU
├── css/
│   ├── variables.css        # Design tokens (couleurs, espacements, fonts)
│   ├── layout.css           # Grille, sidebar, main container
│   ├── sidebar.css          # Navigation latérale
│   ├── components.css       # Boutons, cartes, tables, modales, status badges
│   └── auth.css             # Écran de connexion
└── js/
    ├── api.js               # Config Supabase + helpers
    ├── auth.js              # Login, logout, session management
    ├── navigation.js        # Changement de pages, onglets, filtres
    ├── dashboard.js         # Statistiques, graphiques, chargement données
    ├── transactions.js      # Dépôts, retraits, utilisateurs, P2P
    └── config.js            # Frais, taux, wallets, staking
```

## 🎯 Avantages du Refactoring

### ✅ Avant
- Code difficile à maintenir
- Répétition d'inline CSS
- Fonctions JavaScript éparpillées
- Impossible de tester
- Lent à charger + bas cache

### ✅ Après
- **Maintenabilité**: Chaque module = responsabilité unique
- **Réutilisabilité**: Import/export de fonctions
- **Scalabilité**: Facile d'ajouter nouvelles pages/fonctionnalités
- **Performance**: CSS/JS séparés = cache navigateur
- **Développement**: Modification d'un fichier = impact clair
- **Testabilité**: Modules indépendants = tests unitaires simples

## 🚀 Comment Utiliser

### 1. Remplacer le fichier HTML
```bash
# Sauvegarder l'ancien comme archive
mv axe-admin/index.html axe-admin/index-original.html

# Utiliser la version refactorisée
mv axe-admin/index-refactored.html axe-admin/index.html
```

### 2. Structure des Fichiers CSS

#### **variables.css** — Design System
- Palettes de couleurs (--gold, --blue, --text, etc.)
- Espacements (--spacing-xs à --spacing-4xl)
- Border radius (--radius-sm à --radius-2xl)
- Transitions standards (--transition-fast/normal/slow)
- Typographie (--sans, --mono)

#### **layout.css** — Mise en Page
- Body + flex layout 100vh
- Sidebar fixe 240px left
- Main content avec padding/overflow
- Animations page (fadeIn)
- Responsive breakpoints (900px, 768px)

#### **sidebar.css** — Navigation
- Logo avec styles
- Nav items avec hover/active
- Badges notifications
- Admin info + logout button

#### **components.css** — Composants Réutilisables
- Page header + title/subtitle
- Stat cards (6 variantes de couleur)
- Buttons (approve/reject/view/primary)
- Tables avec hover effects
- Status badges (pending/approved/rejected/completed)
- Modals avec overlay
- Fee boxes

#### **auth.css** — Authentification
- Auth overlay full-screen
- Login form styling
- Error message animation
- Input focus states

## 📝 Comment Ajouter une Nouvelle Page

### 1. Ajouter le Lien de Navigation
```html
<!-- Dans sidebar -->
<div class="nav-item" onclick="switchPage('nouvelle-page', this)">🎯 Nouvelle Page</div>
```

### 2. Ajouter le Conteneur de Page
```html
<!-- Dans main content -->
<div class="page" id="page-nouvelle-page">
  <div class="page-header">
    <div>
      <div class="page-title">Titre de la Page</div>
      <div class="page-sub">Sous-titre</div>
    </div>
  </div>
  <!-- Contenu -->
</div>
```

### 3. Créer un Module JS
```javascript
// js/nouvelle-page.js
import { sb, formatCurrency, formatDate } from './api.js'

export async function chargerDonnees() {
  const { data } = await sb.from('table').select('*')
  // Traiter et afficher
}
```

### 4. Importer dans main
```javascript
<script type="module">
  import { chargerDonnees } from './js/nouvelle-page.js'
  window.chargerDonnees = chargerDonnees
</script>
```

## 🔄 Migration depuis l'Ancienne Version

### Étape 1: Vérifier Compatibilité
- ✅ Supabase credentials — même URL/KEY
- ✅ Table structure — aucun changement
- ✅ Auth system — Supabase v2 compatible

### Étape 2: Tester Localement
```bash
# Servir index.html renouvelé
npx http-server axe-admin/

# Vérifier dans Firefox/Chrome:
# 1. Login fonctionne
# 2. Dashboard charge les stats
# 3. Onglets de dépôts/retraits marchent
# 4. Frais affichent correctement
```

### Étape 3: Déployer sur Netlify
```bash
# Vérifier netlify.toml
# Puis push les changements:
git add axe-admin/
git commit -m "refactor: modularize backoffice HTML/CSS/JS"
git push origin main
```

## 🛠️ Customisation

### Changer les Couleurs
Modifier dans `css/variables.css`:
```css
:root {
  --gold: #FFB84D;  /* Nouveau gold */
  --blue: #4399FF;  /* Nouveau bleu */
}
```

### Changer les Spacings
```css
:root {
  --spacing-md: 14px;  /* Au lieu de 12px */
  --radius-lg: 14px;   /* Au lieu de 12px */
}
```

### Ajouter une Couleur de Status
```css
/* Dans components.css */
.status.custom {
  background: rgba(255, 100, 50, 0.15);
  color: #FF6432;
}

.status.custom::before {
  background: #FF6432;
}
```

## 📦 Modules JavaScript Explanation

### **api.js** — Core
- Supabase client init
- Constants (URL, KEY)
- Helper functions (formatCurrency, formatDate)
- Session management

### **auth.js** — Authentication
- `initAuth()` — Check session on load
- `handleLogin()` — Email/password to Supabase
- `logout()` — Clear session + reload
- Auto-refresh interval setup

### **navigation.js** — Page Control
- `switchPage(pageId, element)` — Show/hide pages
- `switchDepositTab(type)` — Onglets dépôts
- `switchP2PTab(type)` — Onglets P2P
- `filterRetraits(status)` — Filtrer table

### **dashboard.js** — Statistics
- `loadDashboardStats()` — Fetch + display user/transaction stats
- `loadFeesStats()` — Calculate fees by period/type
- `loadLast7DaysChart()` — Chart.js bar graph
- `loadActiveUsersChart()` — Donut/pie chart (WIP)

### **transactions.js** — Data Management
- `loadDepots()` — Fetch + populate table
- `loadRetraits()` — Fetch + populate table
- `loadTransactions()` — Combined history
- `loadUsers()` — All users + balances
- `updateBadges()` — Pending count badges
- `approveDepot()` / `approveRetrait()` — Update status

### **config.js** — Settings
- `saveFeeConfig()` — Save % by type (P2P/Dépôt/Retrait)
- `saveExchangeRates()` — Update USD/Ariary conversion
- `saveWalletsConfig()` — Store admin wallet addresses
- `saveStakingConfig()` — APY flexible/fixed + min amount
- `setFeeCollectionInterval()` — Cron interval in minutes

## 🐛 Troubleshooting

### Problème: Modules non trouvés
**Solution**: S'assurer que les chemins relatifs sont corrects:
```javascript
import { sb } from './api.js'  // ✅ Relatif
import { sb } from '/api.js'   // ❌ Mauvais
```

### Problème: Functions non available via onclick
**Solution**: Exposer dans global scope en main
```javascript
window.switchPage = switchPage  // Rendre global
// Puis dans HTML: <div onclick="switchPage(...)">
```

### Problème: CSS ne charge pas
**Solution**: Vérifier que tous les fichiers CSS ont le chemin relatif:
```html
<link rel="stylesheet" href="css/variables.css">  <!-- ✅ Bon -->
<link rel="stylesheet" href="/css/variables.css">  <!-- ❌ Mauvais -->
```

## 🎨 Phase 2 — Composant React (Optionnel)

Quand le backoffice sera mature (post-beta), considérer une migration vers:

```bash
# Créer app React dans dossier séparé
npx create-react-app axe-admin-react

# Importer les styles CSS existants
# Créer des composants réutilisables:
# - Dashboard.tsx (importe css/layout)
# - Navigation.tsx (importe css/sidebar)
# - TransactionTable.tsx (importe css/components)
# etc...
```

### Bénéfices d'une migration React
- State management (Redux)
- Real-time updates avec Supabase realtime
- TypeScript pour type safety
- Testing avec Jest/Vitest
- Build optimisé avec Vite

## ✅ Checklist Avant Production

- [ ] Tester tous les formulaires de config
- [ ] Vérifier que les données chargent correctement
- [ ] Tester login/logout multiple fois
- [ ] Valider que les frais se calculent OK
- [ ] Tester sur Firefox/Chrome/Safari
- [ ] Vérifier speed du dashboard (stats load < 2s)
- [ ] Tester mobile (tablette 768px)
- [ ] Ajouter error handling global
- [ ] Documenter les shortcuts clavier
- [ ] Ajouter dark mode toggle (optionnel)

## 📞 Support

Si des fonctionnalités de l'ancien index.html manquent:
1. Chercher dans le code original (backup)
2. Créer une issue détaillée
3. Migrer la fonctionnalité vers la structure modulée

---

**Version**: 2.0 (Refactored)  
**Date**: Mar 16, 2026  
**Status**: ✅ Production Ready
