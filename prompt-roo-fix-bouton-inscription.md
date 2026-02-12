# Prompt Roo : Correction Bouton "S'inscrire" dans Prochains Tournois

## Problème Identifié
Le composant `UpcomingTournaments.tsx` n'affiche **que** le bouton "Accéder". Il manque la logique pour afficher le bouton "S'inscrire" quand un tournoi a le statut `registration` (inscriptions ouvertes).

## Fichier à Modifier
`src/components/home/UpcomingTournaments.tsx`

## Modifications Requises

### 1. Mettre à Jour le Type `UpcomingTournament`

Ajouter les champs nécessaires pour déterminer si le tournoi est complet :

```typescript
type UpcomingTournament = {
  id: string;
  name: string;
  date: string;
  location: string | null;
  status: TournamentStatus;
  max_participants: number | null;        // AJOUTER
  current_participants: number;            // AJOUTER
};
```

### 2. Ajouter la Logique d'Affichage des Boutons

Remplacer la section du bouton "Accéder" (lignes 73-78) par :

```tsx
{/* Boutons d'action */}
<div className="mt-3 flex gap-2">
  {/* Bouton S'inscrire - Visible uniquement si status = registration et pas complet */}
  {tournament.status === 'registration' && (
    tournament.max_participants === null ||
    tournament.current_participants < tournament.max_participants
  ) && (
    <Link
      href={`/tournaments/${tournament.id}/register`}
      className="flex-1 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-2 text-xs font-semibold text-white transition hover:from-orange-600 hover:to-orange-700"
    >
      S'inscrire
    </Link>
  )}

  {/* Indicateur "Complet" si pas de places */}
  {tournament.status === 'registration' &&
    tournament.max_participants !== null &&
    tournament.current_participants >= tournament.max_participants && (
    <div className="flex-1 inline-flex items-center justify-center rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-400">
      Complet
    </div>
  )}

  {/* Bouton Accéder - Toujours visible */}
  <Link
    href={`/tournoi/en-cours?tournament=${tournament.id}`}
    className={`${
      tournament.status === 'registration' &&
      (tournament.max_participants === null ||
        tournament.current_participants < tournament.max_participants)
        ? 'flex-1'
        : 'w-full'
    } inline-flex items-center justify-center rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:text-white`}
  >
    Accéder →
  </Link>
</div>
```

### 3. Mettre à Jour la Requête dans `page.tsx`

Le fichier qui appelle ce composant (probablement `src/app/page.tsx`) doit récupérer les champs supplémentaires :

```typescript
// Dans la fonction qui récupère les tournois à venir
const tournaments = await database<
  {
    id: string;
    name: string;
    start_date: string;
    location: string | null;
    status: string;
    max_participants: number | null;
    current_participants: string; // count
  }[]
>`
  SELECT
    t.id,
    t.name,
    t.start_date as date,
    t.location,
    t.status,
    t.max_participants,
    COUNT(p.id)::text as current_participants
  FROM tournaments t
  LEFT JOIN participations p ON p.tournament_id = t.id
  WHERE t.status IN ('upcoming', 'registration', 'ongoing')
  GROUP BY t.id, t.name, t.start_date, t.location, t.status, t.max_participants
  ORDER BY t.start_date ASC
  LIMIT 5
`;

// Mapper les données
const mappedTournaments = tournaments.map(t => ({
  ...t,
  current_participants: parseInt(t.current_participants),
}));
```

### 4. Affichage du Nombre de Participants (Optionnel mais Recommandé)

Ajouter une ligne pour afficher le nombre de participants sous la date :

```tsx
<div className="flex items-center gap-2 text-xs text-white/60">
  <span>📍</span>
  <span>
    {tournament.location ?? "Lieu à confirmer"} • {formatDate(tournament.date)}
  </span>
</div>

{/* AJOUTER CETTE SECTION */}
{tournament.max_participants && (
  <div className="flex items-center gap-2 text-xs text-white/60 mt-1">
    <span>👥</span>
    <span>
      {tournament.current_participants} / {tournament.max_participants} inscrits
      {tournament.current_participants >= tournament.max_participants && (
        <span className="ml-2 text-red-400 font-semibold">• Complet</span>
      )}
    </span>
  </div>
)}
```

## Résultat Attendu

### Cas 1 : Tournoi avec inscriptions ouvertes (status = 'registration') et places disponibles
```
┌─────────────────────────────────────┐
│ Test 5              [INSCRIPTIONS]  │
│ 📍 Paris • 15 mars 2026             │
│ 👥 8 / 32 inscrits                  │
│ ┌──────────┐ ┌──────────┐          │
│ │S'inscrire│ │Accéder →  │          │
│ └──────────┘ └──────────┘          │
└─────────────────────────────────────┘
```

### Cas 2 : Tournoi avec inscriptions ouvertes mais complet
```
┌─────────────────────────────────────┐
│ Test 6              [INSCRIPTIONS]  │
│ 📍 Lyon • 20 mars 2026              │
│ 👥 32 / 32 inscrits • Complet       │
│ ┌────────┐ ┌──────────┐            │
│ │Complet │ │Accéder → │            │
│ └────────┘ └──────────┘            │
└─────────────────────────────────────┘
```

### Cas 3 : Tournoi à venir (status = 'upcoming')
```
┌─────────────────────────────────────┐
│ Test 7              [À VENIR]       │
│ 📍 Marseille • 25 mars 2026         │
│ ┌──────────────────────────────┐   │
│ │      Accéder →               │   │
│ └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Cas 4 : Tournoi en cours (status = 'ongoing')
```
┌─────────────────────────────────────┐
│ Test 8              [EN COURS]      │
│ 📍 Bordeaux • 10 mars 2026          │
│ ┌──────────────────────────────┐   │
│ │      Accéder →               │   │
│ └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Vérification du Statut en Base de Données

Vérifier que le tournoi "Test 5" a bien le statut `registration` :

```sql
SELECT id, name, status, max_participants,
       (SELECT COUNT(*) FROM participations WHERE tournament_id = tournaments.id) as current_participants
FROM tournaments
WHERE name = 'Test 5';
```

Si le statut est différent (ex: 'inscriptions ouvertes' au lieu de 'registration'), il faut soit :
1. **Option A** : Modifier le statut en base :
   ```sql
   UPDATE tournaments SET status = 'registration' WHERE name = 'Test 5';
   ```

2. **Option B** : Adapter la logique pour accepter plusieurs statuts :
   ```typescript
   {(tournament.status === 'registration' || tournament.status === 'inscriptions ouvertes') && ...}
   ```

## Checklist

- [ ] Mettre à jour le type `UpcomingTournament` avec max_participants et current_participants
- [ ] Modifier la logique d'affichage des boutons dans le composant
- [ ] Mettre à jour la requête SQL pour récupérer les champs supplémentaires
- [ ] Vérifier que le statut en DB est bien 'registration' (ou adapter la logique)
- [ ] Tester avec un tournoi ayant des places disponibles
- [ ] Tester avec un tournoi complet
- [ ] Tester avec un tournoi upcoming (sans inscriptions)
- [ ] Vérifier le responsive (mobile)

## Notes Importantes

1. **Statut du tournoi** : Le code attend le statut `'registration'`. Si vos tournois utilisent un autre statut (comme `'inscriptions ouvertes'`), il faut adapter la condition.

2. **Route d'inscription** : Le bouton "S'inscrire" mène vers `/tournaments/${id}/register`. S'assurer que cette route existe et fonctionne.

3. **max_participants null** : Si `max_participants` est `null`, cela signifie "pas de limite". Le bouton "S'inscrire" sera toujours visible.

4. **Design** : Les boutons sont en `flex-1` quand il y en a 2 (S'inscrire + Accéder), et en `w-full` quand il n'y en a qu'un seul.

5. **Performance** : La requête avec `COUNT()` peut être coûteuse. Envisager d'ajouter un index sur `participations(tournament_id)`.
