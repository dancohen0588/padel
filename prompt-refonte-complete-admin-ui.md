# Refonte Complète UI Admin - Tous les Onglets

## 🎯 Objectif

**REFONTE VISUELLE COMPLÈTE** de l'interface admin pour aligner tous les onglets avec la charte graphique dark du site :
- Passer du thème clair actuel au thème dark (#1E1E2E)
- Remplacer **TOUTES** les couleurs violettes par des gradients orange/amber
- Unifier **TOUS** les composants UI (cards, inputs, boutons, toggles)
- **AUCUNE modification fonctionnelle** : Server Actions, logique, routes inchangées

## 📁 Contexte technique

**Stack :**
- Next.js 14+ avec App Router
- TypeScript (strict mode)
- Tailwind CSS avec thème dark (#1E1E2E)
- Radix UI pour certains composants (Switch, etc.)

**Fichiers concernés :**
- `/src/app/admin/inscriptions/page.tsx` - Page admin principale avec onglets
- Tous les composants dans `/src/components/admin/`
- `/src/app/globals.css` - Styles globaux

## 📸 Référence visuelle

**Fichier HTML de validation :** `/admin-inscriptions-dark-theme.html`

Ce fichier montre le design exact attendu. **Suivre pixel-perfect** :
- Background #1E1E2E
- Cards bg-white/5 avec borders white/10
- Boutons gradient orange (from-orange-400 to-orange-500)
- Toggles orange au lieu de violet
- Inputs avec focus orange
- Tabs avec underline orange

## 🎨 Palette de couleurs

### ❌ À REMPLACER (violet/purple)

```css
/* Anciennes couleurs violettes à supprimer */
bg-violet-500, bg-violet-600, bg-purple-500
border-violet-400, border-purple-400
text-violet-400, text-purple-300
from-violet-500, to-violet-600
```

### ✅ NOUVELLES couleurs (orange/amber)

```css
/* Nouvelles couleurs orange à utiliser */

/* Backgrounds */
bg-[#1E1E2E]           /* Background principal */
bg-white/5             /* Cards, conteneurs */
bg-white/10            /* Hover states */

/* Borders */
border-white/10        /* Borders par défaut */
border-orange-400/30   /* Borders hover */
border-orange-400/50   /* Borders focus */

/* Buttons & Actions */
from-orange-400 to-orange-500    /* Gradient boutons primaires */
from-orange-500 to-orange-600    /* Gradient hover */

/* Text */
text-white             /* Texte principal */
text-white/60          /* Texte secondaire */
text-white/40          /* Texte tertiaire */
text-orange-400        /* Texte accentué */

/* Accents */
emerald-400            /* Success / Active states */
amber-400              /* Warning / Info */
red-400                /* Error / Danger */
```

## 🔧 Composants à refondre

### 1. Layout & Structure

#### Background principal
```tsx
// Avant
<body className="bg-gray-50">

// Après
<body className="bg-[#1E1E2E]">
```

#### Header
```tsx
// Avant : Header sombre basique
// Après : Header dark avec gradient

<header className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
  <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
    <h1 className="bg-gradient-to-br from-orange-400 to-amber-200 bg-clip-text text-2xl font-bold text-transparent">
      Le Tournoi des Frérots
    </h1>
    <nav className="flex gap-6">
      <a href="#" className="text-sm font-medium text-white/60 transition hover:text-white">
        Tournoi
      </a>
      <a href="#" className="text-sm font-medium text-orange-400">
        Admin
      </a>
    </nav>
  </div>
</header>
```

#### Titre principal
```tsx
<div className="mb-8">
  <h2 className="gradient-text mb-2 text-4xl font-bold">Admin inscriptions</h2>
  <p className="text-white/60">Gère les tournois, photos et contenus de la home.</p>
</div>

/* CSS */
.gradient-text {
  background: linear-gradient(135deg, #fb923c 0%, #fbbf24 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### 2. Système d'onglets

```tsx
// Avant : Underline violet
// Après : Underline orange

<div className="mb-8 flex gap-8 border-b border-white/10">
  <button className="tab-active pb-4 text-sm font-semibold uppercase tracking-wide">
    Tournois
  </button>
  <button className="pb-4 text-sm font-semibold uppercase tracking-wide text-white/50 transition hover:text-white">
    Paiements
  </button>
  <button className="pb-4 text-sm font-semibold uppercase tracking-wide text-white/50 transition hover:text-white">
    Utilisateurs
  </button>
  <button className="pb-4 text-sm font-semibold uppercase tracking-wide text-white/50 transition hover:text-white">
    Home Photos
  </button>
  <button className="pb-4 text-sm font-semibold uppercase tracking-wide text-white/50 transition hover:text-white">
    Photos (Storage)
  </button>
</div>

/* CSS */
.tab-active {
  color: #fb923c;
  border-bottom: 2px solid #fb923c;
}
```

### 3. Cards & Conteneurs

```tsx
// Avant : bg-white avec shadow
// Après : bg-white/5 avec border-white/10

<div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-card">
  {/* Contenu */}
</div>

/* CSS */
.shadow-card {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
```

### 4. Inputs & Form Fields

```tsx
// Avant : Border grise, bg blanc
// Après : Classe .input-field

<input
  type="text"
  placeholder="Nom du tournoi"
  className="input-field"
/>

<textarea
  placeholder="Description"
  className="input-field resize-none"
  rows={4}
/>

<select className="input-field">
  <option>Option 1</option>
</select>

/* CSS */
.input-field {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px 16px;
  color: white;
  width: 100%;
  transition: all 0.2s ease;
}

.input-field:focus {
  outline: none;
  border-color: rgba(251, 146, 60, 0.5);
  background: rgba(255, 255, 255, 0.08);
}

.input-field::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

/* Spécial pour select */
.input-field option {
  background: #1E1E2E;
  color: white;
}
```

### 5. Boutons

#### Boutons primaires
```tsx
// Avant : bg-violet-500
// Après : Gradient orange

<button className="rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:translate-y-[-2px] hover:shadow-lg">
  Créer
</button>

// Bouton large (submit)
<button className="w-full rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:translate-y-[-2px] hover:shadow-xl">
  Enregistrer
</button>
```

#### Boutons secondaires
```tsx
<button className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
  Annuler
</button>
```

### 6. Toggle Switch (Radix UI)

**IMPORTANT :** Si vous utilisez Radix UI Switch, remplacer le violet par orange :

```tsx
// Composant Switch personnalisé
import * as Switch from '@radix-ui/react-switch';

<Switch.Root
  className="relative h-6 w-11 cursor-pointer rounded-full border-2 border-transparent bg-white/10 transition-colors data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-orange-400 data-[state=checked]:to-orange-500"
>
  <Switch.Thumb className="block h-5 w-5 translate-x-0 rounded-full bg-white shadow-lg transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-5" />
</Switch.Root>

// Si classes CSS custom
.switch-root[data-state='checked'] {
  background: linear-gradient(135deg, #fb923c, #fbbf24);
}
```

### 7. Radio Buttons / Toggle Groups

```tsx
// Pour les groupes de boutons radio (Mode d'appariement, Format playoffs, etc.)

<div className="grid grid-cols-3 gap-2">
  <button
    type="button"
    className={`radio-button rounded-lg px-4 py-2 text-xs font-semibold uppercase ${
      selected === 'manuel' ? 'active' : ''
    }`}
  >
    Manuel
  </button>
  {/* ... autres boutons */}
</div>

/* CSS */
.radio-button {
  transition: all 0.2s ease;
}

.radio-button.active {
  background: linear-gradient(135deg, #fb923c, #fbbf24);
  color: white;
}

.radio-button:not(.active) {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.radio-button:not(.active):hover {
  background: rgba(255, 255, 255, 0.08);
}
```

### 8. Badges de statut

```tsx
// Badge "Inscriptions ouvertes" (vert)
<span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase text-emerald-300">
  Inscriptions ouvertes
</span>

// Badge "Brouillon" (amber)
<span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-amber-400/10 px-3 py-1 text-xs font-semibold uppercase text-amber-300">
  Brouillon
</span>

// Badge "En cours" (blue)
<span className="inline-flex items-center gap-1 rounded-full border border-blue-400/40 bg-gradient-to-r from-blue-500/20 to-blue-400/10 px-3 py-1 text-xs font-semibold uppercase text-blue-300">
  En cours
</span>

// Badge "Archivé" (gray)
<span className="inline-flex items-center gap-1 rounded-full border border-gray-400/40 bg-gradient-to-r from-gray-500/20 to-gray-400/10 px-3 py-1 text-xs font-semibold uppercase text-gray-300">
  Archivé
</span>
```

### 9. Zone de drag & drop

```tsx
<div className="upload-zone flex cursor-pointer flex-col items-center justify-center rounded-2xl py-12">
  <svg className="mb-3 h-12 w-12 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
  <p className="mb-1 text-sm font-semibold text-white/70">
    Glissez-déposez une image ici ou cliquez pour importer
  </p>
  <p className="text-xs text-white/40">(JPG/PNG/WEBP, 5 Mo max)</p>
</div>

/* CSS */
.upload-zone {
  border: 2px dashed rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.03);
  transition: all 0.3s ease;
}

.upload-zone:hover {
  border-color: rgba(251, 146, 60, 0.4);
  background: rgba(251, 146, 60, 0.05);
}
```

### 10. Messages & Alerts

```tsx
// Message d'info (emerald)
<p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
  Renseignez le nombre d'équipes et de poules pour calculer.
</p>

// Message d'erreur (red)
<p className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">
  Une erreur est survenue.
</p>

// Message warning (amber)
<p className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-300">
  Attention : cette action est irréversible.
</p>
```

### 11. Footer

```tsx
<footer className="mt-12 border-t border-white/10 py-6">
  <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-sm text-white/40">
    <p>© 2026 Le Tournoi des Frérots</p>
    <p>Padel crew · Urban Sport vibe</p>
  </div>
</footer>
```

## 📝 Classes CSS globales à ajouter

Ajouter dans `/src/app/globals.css` :

```css
/* === ADMIN UI - DARK THEME === */

/* Gradient text */
.gradient-text {
  background: linear-gradient(135deg, #fb923c 0%, #fbbf24 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Shadow card */
.shadow-card {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

/* Input fields */
.input-field {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px 16px;
  color: white;
  width: 100%;
  transition: all 0.2s ease;
}

.input-field:focus {
  outline: none;
  border-color: rgba(251, 146, 60, 0.5);
  background: rgba(255, 255, 255, 0.08);
}

.input-field::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.input-field option {
  background: #1E1E2E;
  color: white;
}

/* Tabs */
.tab-active {
  color: #fb923c;
  border-bottom: 2px solid #fb923c;
}

/* Radio buttons */
.radio-button {
  transition: all 0.2s ease;
}

.radio-button.active {
  background: linear-gradient(135deg, #fb923c, #fbbf24);
  color: white;
}

.radio-button:not(.active) {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.radio-button:not(.active):hover {
  background: rgba(255, 255, 255, 0.08);
}

/* Upload zone */
.upload-zone {
  border: 2px dashed rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.03);
  transition: all 0.3s ease;
}

.upload-zone:hover {
  border-color: rgba(251, 146, 60, 0.4);
  background: rgba(251, 146, 60, 0.05);
}

/* Switch override (si Radix UI) */
.switch-root[data-state='checked'] {
  background: linear-gradient(135deg, #fb923c, #fbbf24) !important;
}
```

## 🎯 Checklist par onglet

### ✅ Onglet "Tournois"
- [ ] Background #1E1E2E
- [ ] Cards bg-white/5 avec borders white/10
- [ ] Bouton "Créer" gradient orange
- [ ] Bouton "Configurer" gradient orange (au lieu de violet)
- [ ] Input recherche avec classe .input-field
- [ ] Badge "Inscriptions ouvertes" emerald
- [ ] Tous les champs du formulaire avec .input-field
- [ ] Radio buttons avec classe .radio-button
- [ ] Zone upload avec classe .upload-zone
- [ ] Bouton submit "Créer" gradient orange

### ✅ Onglet "Paiements"
- [ ] Background #1E1E2E
- [ ] Cards bg-white/5 avec borders white/10
- [ ] Toggle "Paiements activés" orange (au lieu de violet)
- [ ] Tous les toggles (Virement, Lydia, Revolut, etc.) orange
- [ ] Tous les inputs avec .input-field
- [ ] Bouton "Enregistrer" gradient orange
- [ ] Labels en text-white
- [ ] Sous-titres en text-white/60

### ✅ Onglet "Utilisateurs"
- [ ] Background #1E1E2E
- [ ] Table avec bg-white/5 et borders white/10
- [ ] Boutons actions gradient orange
- [ ] Input recherche avec .input-field
- [ ] Select filtres avec .input-field
- [ ] Badges statut colorés (emerald/amber/red)
- [ ] Modal d'édition avec bg-[#1E1E2E]
- [ ] Tous les inputs du modal avec .input-field

### ✅ Onglet "Home Photos"
- [ ] Background #1E1E2E
- [ ] Cards bg-white/5 avec borders white/10
- [ ] Boutons upload/actions gradient orange
- [ ] Zone drag & drop avec .upload-zone
- [ ] Preview images avec borders white/10

### ✅ Onglet "Photos (Storage)"
- [ ] Background #1E1E2E
- [ ] Grille photos avec borders white/10
- [ ] Boutons actions gradient orange
- [ ] Filtres/recherche avec .input-field
- [ ] Modals avec bg-[#1E1E2E]

## ⚠️ Points d'attention

### NE PAS MODIFIER
- Server Actions (logique fetch/create/update/delete)
- States React (useState, useFormState, etc.)
- Types TypeScript
- Validation des formulaires
- Routes et navigation
- Logique métier

### MODIFIER UNIQUEMENT
- Classes Tailwind CSS
- Couleurs (remplacer violet → orange)
- Styles inline si nécessaire
- Ajout de classes CSS custom
- Wrappers div pour styling (si absolument nécessaire)

## 🧪 Tests à effectuer

1. ✅ **Onglet Tournois**
   - [ ] Affichage correct en dark
   - [ ] Création d'un tournoi fonctionne
   - [ ] Recherche fonctionne
   - [ ] Upload photo fonctionne

2. ✅ **Onglet Paiements**
   - [ ] Toggles fonctionnent
   - [ ] Enregistrement des configs fonctionne
   - [ ] Validation des champs (IBAN, etc.)

3. ✅ **Onglet Utilisateurs**
   - [ ] Liste affichée correctement
   - [ ] Recherche/filtres fonctionnent
   - [ ] Modal d'édition s'ouvre
   - [ ] Modification utilisateur fonctionne

4. ✅ **Onglet Home Photos**
   - [ ] Upload photos fonctionne
   - [ ] Preview correct
   - [ ] Suppression fonctionne

5. ✅ **Onglet Photos (Storage)**
   - [ ] Liste photos affichée
   - [ ] Actions fonctionnent

6. ✅ **Général**
   - [ ] Navigation entre onglets fluide
   - [ ] Responsive mobile/tablet
   - [ ] Pas d'erreurs console
   - [ ] Build Next.js réussit

## 🎨 Résultat attendu

Une interface admin **identique visuellement** au fichier HTML de référence :
- Thème dark cohérent partout
- Couleurs orange/amber pour tous les éléments interactifs
- Transitions fluides
- Design moderne avec glassmorphism
- **Fonctionnalités 100% préservées**

## 🚀 Commandes de test

```bash
# Dev server
npm run dev

# Accéder à l'admin
# http://localhost:3000/admin/inscriptions?token=frerots-2026

# Type check
npm run type-check

# Build
npm run build
```

## 📚 Ressources

- **HTML de référence :** `/admin-inscriptions-dark-theme.html`
- **Tailwind Docs :** https://tailwindcss.com/docs
- **Radix UI :** https://www.radix-ui.com/ (pour les composants Switch)

---

**IMPORTANT :** Cette refonte est **purement visuelle**. Aucune logique métier ne doit être modifiée. En cas de doute, prioriser la préservation du fonctionnel sur l'esthétique.
