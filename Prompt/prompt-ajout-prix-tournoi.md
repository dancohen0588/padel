# Prompt d'Implémentation - Ajout du Champ Prix aux Tournois

## 📋 Contexte du Projet

**Projet** : Application Next.js 14+ (App Router) de gestion de tournois de padel
**Base de données** : PostgreSQL avec SQL direct (pas de Prisma)
**Stack technique** :
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- PostgreSQL
- Server Actions

## 🎯 Objectif Global

Ajouter un champ "Prix" aux tournois qui sera :
1. **Éditable** dans la page d'administration `/admin/inscriptions`
2. **Affiché** sur les cards des prochains tournois sur la page d'accueil

---

## 🗄️ ÉTAPE 1 : Migration de Base de Données

### Fichier à créer : `database/migrations/XXXX_add_price_to_tournaments.sql`

```sql
-- Migration: Ajout du champ prix aux tournois

-- Ajouter la colonne price à la table tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);

-- Commenter la colonne pour la documentation
COMMENT ON COLUMN public.tournaments.price IS 'Prix d''inscription au tournoi en euros';

-- Optionnel: Ajouter une contrainte pour s'assurer que le prix est positif ou nul
ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_price_positive CHECK (price IS NULL OR price >= 0);
```

**Notes** :
- Le type `DECIMAL(10, 2)` permet de stocker des prix avec 2 décimales (ex: 25.50)
- La colonne est nullable pour permettre des tournois gratuits ou sans prix défini
- La contrainte CHECK empêche les prix négatifs

**Exécution** :
```bash
psql -U votre_user -d votre_database < database/migrations/XXXX_add_price_to_tournaments.sql
```

---

## 📝 ÉTAPE 2 : Mise à Jour du Type TypeScript

### Fichier à modifier : `src/lib/types.ts`

Localiser le type `Tournament` et ajouter le champ `price` :

```typescript
export type Tournament = {
  id: string;
  slug: string | null;
  name: string;
  date: string;
  location: string | null;
  description: string | null;
  status: TournamentStatus;
  max_players: number | null;
  image_path: string | null;
  config: TournamentConfig;
  created_at: string;
  price: number | null;  // ⬅️ AJOUTER CETTE LIGNE
};
```

---

## ⚙️ ÉTAPE 3 : Modifier l'Action de Sauvegarde du Tournoi

### Fichier à modifier : `src/app/actions/tournaments.ts`

### 3.1 Extraire le prix du formulaire

Dans la fonction `upsertTournamentAction`, **après la ligne 48** (après `imagePath`), ajouter :

```typescript
const price = getValue(formData, "price");
const priceValue = price !== null && price !== "" ? Number(price) : null;
```

### 3.2 Ajouter le prix dans la requête UPDATE

Dans la requête `UPDATE` (autour de la ligne 95-107), **après** `image_path = ${imagePath || null},`, ajouter :

```typescript
await database`
  update tournaments
  set
    slug = ${slug || null},
    name = ${name},
    date = ${date},
    location = ${location || null},
    description = ${description || null},
    status = ${status},
    max_players = ${maxPlayers || null},
    image_path = ${imagePath || null},
    price = ${priceValue},                    // ⬅️ AJOUTER CETTE LIGNE
    config = ${database.json(config)}
  where id = ${tournamentId}
`;
```

### 3.3 Ajouter le prix dans la requête INSERT

Dans la requête `INSERT` (autour de la ligne 114-127), modifier :

**Avant** :
```typescript
const created = await database<Array<{ id: string }>>`
  insert into tournaments (slug, name, date, location, description, status, max_players, image_path, config)
  values (
    ${slug || null},
    ${name},
    ${date},
    ${location || null},
    ${description || null},
    ${status},
    ${maxPlayers || null},
    ${imagePath || null},
    ${database.json(config || DEFAULT_CONFIG)}
  )
  returning id
`;
```

**Après** :
```typescript
const created = await database<Array<{ id: string }>>`
  insert into tournaments (slug, name, date, location, description, status, max_players, image_path, price, config)
  values (
    ${slug || null},
    ${name},
    ${date},
    ${location || null},
    ${description || null},
    ${status},
    ${maxPlayers || null},
    ${imagePath || null},
    ${priceValue},                            // ⬅️ AJOUTER CETTE LIGNE
    ${database.json(config || DEFAULT_CONFIG)}
  )
  returning id
`;
```

---

## 🖥️ ÉTAPE 4 : Ajouter le Champ Prix au Formulaire Admin

### Fichier à modifier : `src/components/admin/tabs/TournamentsTab.tsx`

### 4.1 Ajouter l'état local pour le prix

**Après la ligne 38** (après `const [slugValue, setSlugValue] = useState("")`), ajouter :

```typescript
const [priceValue, setPriceValue] = useState<string>("");
```

### 4.2 Initialiser l'état avec la valeur du tournoi sélectionné

Dans le `useEffect` qui initialise les valeurs (autour de la ligne 67-80), **après** `setImagePreview(selected?.image_path ?? null);`, ajouter :

```typescript
setPriceValue(selected?.price !== null && selected?.price !== undefined ? String(selected.price) : "");
```

### 4.3 Ajouter le champ dans le formulaire

Dans le formulaire, **après le champ "Lieu"** (autour de la ligne 389), ajouter :

```tsx
<label className="flex flex-col gap-2 text-sm font-semibold text-brand-charcoal">
  Prix d'inscription (€)
  <Input
    name="price"
    type="number"
    step="0.01"
    min="0"
    placeholder="Ex: 25.00"
    value={priceValue}
    onChange={(event) => setPriceValue(event.target.value)}
  />
  <span className="text-xs text-muted-foreground">
    Laissez vide pour un tournoi gratuit ou sans prix défini
  </span>
</label>
```

**Position exacte** : Insérer ce code **entre** le champ "Lieu" et le champ "Nombre d'équipes".

---

## 🏠 ÉTAPE 5 : Afficher le Prix sur la Home Page

### 5.1 Modifier la requête dans la page d'accueil

### Fichier à modifier : `src/app/page.tsx`

Dans la requête qui récupère les tournois à venir (autour de la ligne 49-76), ajouter le champ `price` :

**Avant** :
```typescript
database<
  Array<{
    id: string;
    slug: string | null;
    name: string;
    date: string;
    location: string | null;
    status: TournamentStatus;
    max_participants: number | null;
    current_participants: string;
  }>
>`
  select
    t.id,
    t.slug,
    t.name,
    t.date::text as date,
    t.location,
    t.status,
    t.max_players as max_participants,
    count(r.id)::text as current_participants
  from tournaments t
  left join registrations r on r.tournament_id = t.id
  where t.status in ('upcoming', 'registration', 'ongoing')
  group by t.id, t.slug, t.name, t.date, t.location, t.status, t.max_players
  order by t.date asc
  limit 3
`,
```

**Après** :
```typescript
database<
  Array<{
    id: string;
    slug: string | null;
    name: string;
    date: string;
    location: string | null;
    status: TournamentStatus;
    max_participants: number | null;
    current_participants: string;
    price: number | null;              // ⬅️ AJOUTER CETTE LIGNE
  }>
>`
  select
    t.id,
    t.slug,
    t.name,
    t.date::text as date,
    t.location,
    t.status,
    t.max_players as max_participants,
    t.price,                             // ⬅️ AJOUTER CETTE LIGNE
    count(r.id)::text as current_participants
  from tournaments t
  left join registrations r on r.tournament_id = t.id
  where t.status in ('upcoming', 'registration', 'ongoing')
  group by t.id, t.slug, t.name, t.date, t.location, t.status, t.max_players, t.price  -- ⬅️ AJOUTER t.price ICI
  order by t.date asc
  limit 3
`,
```

### 5.2 Passer le prix au composant

**Après la ligne 100**, dans le mapping des tournois (ligne qui commence par `const upcomingTournaments = upcomingRows.map`), ajouter le champ `price` :

```typescript
const upcomingTournaments = upcomingRows.map((row) => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  date: row.date,
  location: row.location,
  status: row.status,
  max_participants: row.max_participants,
  current_participants: Number(row.current_participants),
  price: row.price,                    // ⬅️ AJOUTER CETTE LIGNE
}));
```

### 5.3 Modifier le composant UpcomingTournaments

### Fichier à modifier : `src/components/home/UpcomingTournaments.tsx`

### 5.3.1 Ajouter le prix au type

**Dans le type `UpcomingTournament`** (ligne 6-15), ajouter :

```typescript
type UpcomingTournament = {
  id: string;
  slug: string | null;
  name: string;
  date: string;
  location: string | null;
  status: TournamentStatus;
  max_participants: number | null;
  current_participants: number;
  price: number | null;              // ⬅️ AJOUTER CETTE LIGNE
};
```

### 5.3.2 Afficher le prix dans la card

**Dans le JSX de la card**, **après** l'affichage du nombre d'inscrits (autour de la ligne 91, juste avant la `div` avec `mt-3`), ajouter :

```tsx
{tournament.price !== null && tournament.price > 0 && (
  <div className="mt-1 flex items-center gap-2 text-xs text-white/80">
    <span>💰</span>
    <span className="font-semibold">
      {new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(tournament.price)}
    </span>
  </div>
)}
{tournament.price === 0 && (
  <div className="mt-1 flex items-center gap-2 text-xs text-white/80">
    <span>🎁</span>
    <span className="font-semibold">Gratuit</span>
  </div>
)}
```

**Position exacte** : Insérer ce code juste avant la ligne qui commence par `<div className="mt-3 flex gap-2">` (ligne ~92).

**Résultat attendu** :
- Si le prix est > 0 : Affiche "💰 25,00 €" (ou le prix formaté)
- Si le prix est exactement 0 : Affiche "🎁 Gratuit"
- Si le prix est null (non défini) : N'affiche rien

---

## ✅ CHECKLIST DE VÉRIFICATION

Avant de considérer l'implémentation terminée, vérifier que :

### Base de données
- [ ] La migration SQL a été exécutée avec succès
- [ ] La colonne `price` existe dans la table `tournaments`
- [ ] La contrainte CHECK empêche les prix négatifs

### Backend
- [ ] Le type `Tournament` inclut le champ `price`
- [ ] L'action `upsertTournamentAction` extrait le prix du formulaire
- [ ] L'action `upsertTournamentAction` sauvegarde le prix (INSERT et UPDATE)

### Frontend Admin
- [ ] Le champ "Prix d'inscription" est visible dans le formulaire
- [ ] Le champ accepte des nombres décimaux (ex: 25.50)
- [ ] Le champ est pré-rempli lors de l'édition d'un tournoi existant
- [ ] Le champ peut être laissé vide (tournoi gratuit/sans prix)

### Frontend Home
- [ ] La requête de page.tsx récupère le champ `price`
- [ ] Le composant `UpcomingTournaments` reçoit le prix
- [ ] Le prix s'affiche correctement sur les cards (formatage en euros)
- [ ] "Gratuit" s'affiche pour les tournois à 0€
- [ ] Rien ne s'affiche si le prix est null

---

## 🧪 TESTS MANUELS

### Test 1 : Créer un tournoi avec prix
1. Aller sur `/admin/inscriptions?token=VOTRE_TOKEN`
2. Cliquer sur "Créer"
3. Remplir le formulaire avec un prix de "35.00"
4. Cliquer sur "Créer"
5. **Vérifier** : Le tournoi est créé avec le prix
6. Aller sur la home page `/`
7. **Vérifier** : Le prix "35,00 €" s'affiche sur la card du tournoi

### Test 2 : Modifier le prix d'un tournoi existant
1. Aller sur `/admin/inscriptions?token=VOTRE_TOKEN`
2. Sélectionner un tournoi existant
3. Modifier le prix (ex: passer de 35.00 à 50.00)
4. Cliquer sur "Mettre à jour"
5. **Vérifier** : Le prix est mis à jour
6. Aller sur la home page `/`
7. **Vérifier** : Le nouveau prix s'affiche

### Test 3 : Tournoi gratuit
1. Aller sur `/admin/inscriptions?token=VOTRE_TOKEN`
2. Créer ou modifier un tournoi avec prix "0"
3. **Vérifier** : Le tournoi est sauvegardé
4. Aller sur la home page `/`
5. **Vérifier** : "🎁 Gratuit" s'affiche sur la card

### Test 4 : Tournoi sans prix défini
1. Aller sur `/admin/inscriptions?token=VOTRE_TOKEN`
2. Créer un tournoi en laissant le champ prix vide
3. **Vérifier** : Le tournoi est sauvegardé
4. Aller sur la home page `/`
5. **Vérifier** : Aucune information de prix ne s'affiche (comportement normal)

### Test 5 : Validation du format
1. Aller sur `/admin/inscriptions?token=VOTRE_TOKEN`
2. Essayer d'entrer un prix négatif (ex: -10)
3. **Vérifier** : Le navigateur empêche la saisie (attribut `min="0"`)
4. Essayer d'entrer un prix décimal (ex: 25.50)
5. **Vérifier** : Le prix est accepté et sauvegardé correctement

---

## 🎨 APERÇU VISUEL

### Formulaire Admin - Nouveau champ Prix

```
┌─────────────────────────────────────────┐
│ Lieu                                     │
│ ┌─────────────────────────────────────┐ │
│ │ Padel Club Paris                    │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Prix d'inscription (€)                   │
│ ┌─────────────────────────────────────┐ │
│ │ 25.00                               │ │
│ └─────────────────────────────────────┘ │
│ Laissez vide pour un tournoi gratuit    │
│ ou sans prix défini                      │
│                                          │
│ Nombre d'équipes                         │
│ ┌─────────────────────────────────────┐ │
│ │ 32                                  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Card Home Page - Affichage du prix

```
┌─────────────────────────────────────────────┐
│  Tournoi Printemps 2026        [Inscriptions]│
│  📍 Paris • 25 mars 2026                     │
│  👥 12 / 32 inscrits                         │
│  💰 25,00 €                                  │ ⬅️ NOUVEAU
│  ┌─────────────────┐                         │
│  │   S'inscrire    │                         │
│  └─────────────────┘                         │
└─────────────────────────────────────────────┘
```

**Si gratuit :**
```
┌─────────────────────────────────────────────┐
│  Tournoi Débutants                [Inscriptions]│
│  📍 Lyon • 30 mars 2026                      │
│  👥 8 / 16 inscrits                          │
│  🎁 Gratuit                                  │ ⬅️ NOUVEAU
│  ┌─────────────────┐                         │
│  │   S'inscrire    │                         │
│  └─────────────────┘                         │
└─────────────────────────────────────────────┘
```

---

## 📊 STRUCTURE DES MODIFICATIONS

```
Fichiers à créer (1) :
├── database/migrations/XXXX_add_price_to_tournaments.sql

Fichiers à modifier (5) :
├── src/lib/types.ts
├── src/app/actions/tournaments.ts
├── src/components/admin/tabs/TournamentsTab.tsx
├── src/app/page.tsx
└── src/components/home/UpcomingTournaments.tsx
```

---

## 🔄 ORDRE D'EXÉCUTION RECOMMANDÉ

1. **Créer et exécuter** la migration SQL
2. **Modifier** `src/lib/types.ts` (ajouter le champ au type)
3. **Modifier** `src/app/actions/tournaments.ts` (sauvegarder le prix)
4. **Modifier** `src/components/admin/tabs/TournamentsTab.tsx` (formulaire)
5. **Modifier** `src/app/page.tsx` (récupérer le prix)
6. **Modifier** `src/components/home/UpcomingTournaments.tsx` (afficher le prix)
7. **Tester** l'ensemble du flow

---

## 💡 NOTES TECHNIQUES

### Format des Prix
- Stockage en base : `DECIMAL(10, 2)` permet de stocker jusqu'à 99 999 999,99 €
- Affichage : Utilise `Intl.NumberFormat` pour un formatage automatique selon la locale française
- Saisie : Input de type `number` avec `step="0.01"` pour les centimes

### Comportement des Prix
- **null** : Prix non défini, rien ne s'affiche sur la home page
- **0** : Tournoi gratuit, affiche "🎁 Gratuit"
- **> 0** : Prix défini, affiche "💰 XX,XX €"

### Validation
- Validation côté client : attribut `min="0"` empêche les prix négatifs
- Validation côté base : contrainte CHECK empêche les valeurs négatives
- Pas de validation du maximum (peut être ajouté si nécessaire)

### Compatibilité
- Les tournois existants sans prix auront `price = null`
- Ils s'afficheront normalement sans information de prix
- Pas de migration de données nécessaire

---

## 🚀 RÉSUMÉ POUR COPIER-COLLER

Pour une implémentation rapide, voici les lignes exactes à ajouter :

### 1. Migration SQL
```sql
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);
ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_price_positive CHECK (price IS NULL OR price >= 0);
```

### 2. Type TypeScript
```typescript
price: number | null;
```

### 3. Action (extraction)
```typescript
const price = getValue(formData, "price");
const priceValue = price !== null && price !== "" ? Number(price) : null;
```

### 4. Action (UPDATE)
```typescript
price = ${priceValue},
```

### 5. Action (INSERT)
Ajouter `price` dans la liste des colonnes et `${priceValue}` dans les values

### 6. Formulaire Admin
```tsx
<label className="flex flex-col gap-2 text-sm font-semibold text-brand-charcoal">
  Prix d'inscription (€)
  <Input name="price" type="number" step="0.01" min="0" placeholder="Ex: 25.00"
    value={priceValue} onChange={(e) => setPriceValue(e.target.value)} />
  <span className="text-xs text-muted-foreground">
    Laissez vide pour un tournoi gratuit ou sans prix défini
  </span>
</label>
```

### 7. Affichage Home
```tsx
{tournament.price !== null && tournament.price > 0 && (
  <div className="mt-1 flex items-center gap-2 text-xs text-white/80">
    <span>💰</span>
    <span className="font-semibold">
      {new Intl.NumberFormat('fr-FR', {
        style: 'currency', currency: 'EUR',
        minimumFractionDigits: 0, maximumFractionDigits: 2
      }).format(tournament.price)}
    </span>
  </div>
)}
{tournament.price === 0 && (
  <div className="mt-1 flex items-center gap-2 text-xs text-white/80">
    <span>🎁</span><span className="font-semibold">Gratuit</span>
  </div>
)}
```

---

Bonne implémentation ! 🎾
