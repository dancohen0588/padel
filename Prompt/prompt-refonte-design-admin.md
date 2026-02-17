# Refonte Design : Zone Admin - Alignement avec la Charte Graphique

## Contexte technique

**Stack :**
- Next.js 14+ avec App Router
- TypeScript (strict mode)
- Tailwind CSS avec thème dark (#1E1E2E)
- Server Actions existantes (à ne PAS modifier)

**Fichiers principaux concernés :**
- `/src/app/admin/inscriptions/page.tsx` - Page admin principale
- Composants associés dans `/src/components/admin/`
- Styles globaux si nécessaire

## Objectif

**REFONTE VISUELLE UNIQUEMENT** - Aligner le design de la zone admin avec la charte graphique dark du reste du site :
- Passer du thème clair/blanc actuel au thème dark (#1E1E2E)
- Remplacer les couleurs violettes par des gradients orange/amber
- Unifier les composants UI (cards, inputs, boutons)
- **AUCUNE modification fonctionnelle** : logique métier, Server Actions, routes, states inchangés

## Validation visuelle

Un fichier HTML de validation est disponible : `/admin-inscriptions-dark-theme.html`
Il montre **exactement** le rendu visuel attendu avec tous les éléments stylés correctement.

## Changements de design à appliquer

### 1. Couleurs globales

**Avant (actuel) :**
- Background : Blanc/Gris clair
- Boutons primaires : Violet (#8B5CF6 ou similaire)
- Cards : Blanc avec ombres grises

**Après (nouveau) :**
- Background : `#1E1E2E` (dark)
- Boutons primaires : Gradient `from-orange-400 to-orange-500`
- Cards : `bg-white/5` avec `border-white/10`

### 2. Composants UI

#### Header
```tsx
// Avant : Fond sombre avec texte blanc simple
// Après : Fond dark avec blur et gradient sur le titre

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

#### Titres principaux
```tsx
// Utiliser le gradient orange pour tous les titres h1/h2
<h2 className="gradient-text mb-2 text-4xl font-bold">Admin inscriptions</h2>
<p className="text-white/60">Gère les tournois, photos et contenus de la home.</p>

// Ajouter cette classe CSS globale
.gradient-text {
  background: linear-gradient(135deg, #fb923c 0%, #fbbf24 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

#### Onglets (Tabs)
```tsx
// Avant : Underline violet pour l'onglet actif
// Après : Underline orange

<div className="mb-8 flex gap-8 border-b border-white/10">
  <button className="tab-active pb-4 text-sm font-semibold uppercase tracking-wide">
    Tournois
  </button>
  <button className="pb-4 text-sm font-semibold uppercase tracking-wide text-white/50 transition hover:text-white">
    Paiements
  </button>
  {/* ... autres onglets */}
</div>

// CSS
.tab-active {
  color: #fb923c;
  border-bottom: 2px solid #fb923c;
}
```

#### Cards
```tsx
// Avant : bg-white avec shadow grise
// Après : bg-white/5 avec border-white/10

<div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-card">
  {/* Contenu */}
</div>

// CSS
.shadow-card {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
```

#### Inputs
```tsx
// Avant : Border grise, bg blanc
// Après : bg-white/5, border-white/10, focus orange

<input
  type="text"
  placeholder="Rechercher un tournoi"
  className="input-field"
/>

// CSS
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
```

#### Boutons primaires
```tsx
// Avant : bg-violet-500 ou similaire
// Après : Gradient orange

<button className="rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:translate-y-[-2px] hover:shadow-lg">
  Créer
</button>

// Pour les gros boutons (submit)
<button className="w-full rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:translate-y-[-2px] hover:shadow-xl">
  Créer
</button>
```

#### Radio buttons / Toggle buttons
```tsx
// Avant : Violet quand actif
// Après : Gradient orange quand actif, bg-white/5 sinon

<div className="grid grid-cols-3 gap-2">
  <button type="button" className="radio-button rounded-lg px-4 py-2 text-xs font-semibold uppercase">
    Manuel
  </button>
  <button type="button" className="radio-button rounded-lg px-4 py-2 text-xs font-semibold uppercase">
    Automatique
  </button>
  <button type="button" className="radio-button active rounded-lg px-4 py-2 text-xs font-semibold uppercase">
    Auto Équitable
  </button>
</div>

// CSS
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

#### Badges de statut
```tsx
// Badge "Inscriptions ouvertes" - utiliser emerald (vert)
<span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase text-emerald-300">
  Inscriptions ouvertes
</span>

// Badge "Brouillon" - utiliser amber
<span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-amber-400/10 px-3 py-1 text-xs font-semibold uppercase text-amber-300">
  Brouillon
</span>

// Badge "En cours" - utiliser blue
<span className="inline-flex items-center gap-1 rounded-full border border-blue-400/40 bg-gradient-to-r from-blue-500/20 to-blue-400/10 px-3 py-1 text-xs font-semibold uppercase text-blue-300">
  En cours
</span>
```

#### Zone de drag & drop (upload)
```tsx
<div className="upload-zone flex cursor-pointer flex-col items-center justify-center rounded-2xl py-12">
  <svg className="mb-3 h-12 w-12 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
  <p className="mb-1 text-sm font-semibold text-white/70">Glissez-déposez une image ici ou cliquez pour importer</p>
  <p className="text-xs text-white/40">(JPG/PNG/WEBP, 5 Mo max)</p>
</div>

// CSS
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

#### Footer
```tsx
<footer className="mt-12 border-t border-white/10 py-6">
  <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-sm text-white/40">
    <p>© 2026 Le Tournoi des Frérots</p>
    <p>Padel crew · Urban Sport vibe</p>
  </div>
</footer>
```

### 3. Ajout de classes CSS globales

Ajouter dans `/src/app/globals.css` ou créer `/src/styles/admin.css` :

```css
/* Gradient text pour les titres */
.gradient-text {
  background: linear-gradient(135deg, #fb923c 0%, #fbbf24 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Shadow pour les cards */
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
```

## Checklist de migration

### Étape 1 : Background et structure
- [ ] Changer le background de la page en `bg-[#1E1E2E]`
- [ ] Mettre à jour le header avec `border-b border-white/10 bg-white/5`
- [ ] Appliquer le gradient orange au titre principal

### Étape 2 : Onglets et navigation
- [ ] Remplacer l'underline violet par orange sur les tabs
- [ ] Utiliser `text-white/50` pour les tabs inactifs
- [ ] Ajouter `hover:text-white` sur les tabs

### Étape 3 : Cards et conteneurs
- [ ] Remplacer tous les `bg-white` par `bg-white/5`
- [ ] Ajouter `border border-white/10` sur toutes les cards
- [ ] Appliquer `shadow-card` au lieu des shadows Tailwind

### Étape 4 : Inputs et formulaires
- [ ] Remplacer tous les inputs par la classe `.input-field`
- [ ] Vérifier le focus orange sur tous les champs
- [ ] Mettre à jour les placeholders en `text-white/30`

### Étape 5 : Boutons
- [ ] Remplacer tous les boutons violets par gradient orange
- [ ] Vérifier les hover effects (translate-y-[-2px])
- [ ] Mettre à jour les radio buttons avec la classe `.radio-button`

### Étape 6 : Badges et statuts
- [ ] Utiliser emerald pour "Inscriptions ouvertes"
- [ ] Utiliser amber pour "Brouillon" / "À venir"
- [ ] Utiliser blue pour "En cours"
- [ ] Utiliser gray pour "Archivé"

### Étape 7 : Zones spéciales
- [ ] Mettre à jour la zone de drag & drop avec `.upload-zone`
- [ ] Vérifier les messages d'info (texte emerald/amber)
- [ ] Mettre à jour le footer

### Étape 8 : Responsive et polish
- [ ] Vérifier que tout est responsive
- [ ] Tester les transitions et animations
- [ ] Vérifier la lisibilité de tous les textes
- [ ] Valider avec le fichier HTML de référence

## Points d'attention critiques

### ⚠️ NE PAS MODIFIER

**Logique métier :**
- Server Actions (fetch, create, update, delete)
- States React (useState, useFormState, etc.)
- Logique de validation
- Routes et navigation
- Gestion des erreurs

**Structure des données :**
- Props des composants
- Types TypeScript
- Schéma de formulaire
- Query parameters

### ✅ À MODIFIER UNIQUEMENT

**Styles visuels :**
- Classes Tailwind CSS
- Couleurs (hex, rgba)
- Spacing (padding, margin) si nécessaire pour l'alignement
- Borders et shadows
- Gradients
- Transitions et animations

**Markup HTML (si nécessaire) :**
- Uniquement pour ajouter des wrappers pour le styling
- Ne pas changer la hiérarchie fonctionnelle
- Ne pas supprimer d'éléments existants

## Tests à effectuer

1. ✅ Vérifier que la page s'affiche correctement en dark mode
2. ✅ Tester tous les boutons (hover, active)
3. ✅ Vérifier le focus sur tous les inputs
4. ✅ Tester les onglets (navigation)
5. ✅ Vérifier la création d'un tournoi (fonctionnalité inchangée)
6. ✅ Tester la recherche de tournoi
7. ✅ Vérifier le responsive sur mobile/tablet
8. ✅ Comparer avec le fichier HTML de référence

## Référence visuelle

**IMPORTANT :** Ouvrir `admin-inscriptions-dark-theme.html` dans un navigateur et suivre **EXACTEMENT** ce design.

Tous les éléments doivent correspondre pixel-perfect au rendu HTML :
- Couleurs identiques
- Espacements identiques
- Effets hover identiques
- Gradients identiques

## Commandes utiles

```bash
# Lancer le dev server pour tester
npm run dev

# Accéder à la page admin
# http://localhost:3000/admin/inscriptions?token=frerots-2026

# Vérifier les erreurs TypeScript
npm run type-check

# Build pour vérifier qu'il n'y a pas d'erreurs
npm run build
```

## Notes importantes

- **Cette refonte est purement visuelle** - aucune logique métier ne doit être touchée
- Utiliser les classes Tailwind autant que possible
- Pour les styles complexes (gradients, animations), utiliser les classes CSS custom définies
- Tester sur plusieurs navigateurs pour s'assurer de la compatibilité
- Comparer constamment avec le fichier HTML de référence

## Résultat attendu

Une zone admin visuellement **identique** au fichier HTML de référence, avec :
- Thème dark cohérent avec le reste du site
- Couleurs orange/amber pour tous les éléments interactifs
- Cards et inputs avec le style glassmorphism
- Transitions fluides
- **Fonctionnalités 100% préservées**
