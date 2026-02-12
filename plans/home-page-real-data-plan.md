# Plan — Home page données réelles + page démo

## Hypothèses confirmées
- Conserver la home existante et **remplacer uniquement** les stats Hero + le bloc « Prochains tournois ». Le reste du contenu est conservé.
- Étendre le schéma pour `tournaments.status` avec `upcoming`, `registration`, `ongoing`.
- Bouton « Accéder » → `/tournoi/en-cours?tournament=ID`.
- Ajouter `date-fns` pour le formatage FR des dates.

## Étapes proposées
1. **Migration SQL statuts tournois**
   - Créer une migration pour élargir le `check` de `tournaments.status`.
   - Mettre à jour [`database/schema.sql`](database/schema.sql:1) et éventuellement [`database/seed.sql`](database/seed.sql:1) si besoin de valeurs de démonstration.

2. **Types & queries**
   - Étendre `TournamentStatus` dans [`src/lib/types.ts`](src/lib/types.ts:1) avec `upcoming`, `registration`, `ongoing`.
   - Adapter les fonctions de requêtes existantes dans [`src/lib/queries.ts`](src/lib/queries.ts:1) si elles filtrent sur `published`.

3. **Stats réelles pour le Hero**
   - Implémenter des requêtes DB dans [`src/app/page.tsx`](src/app/page.tsx:1) :
     - Tournois : `count(*)` (tous statuts).
     - Matchs joués : `matches.status = 'finished'`.
     - Joueurs actifs : `count(distinct registrations.player_id)` avec `status = 'approved'`.
     - Sets : `count(*)` dans `match_sets`.
   - Mapper les résultats vers les props du Hero sans refonte visuelle.

4. **Bloc « Prochains tournois » amélioré**
   - Créer un composant dédié [`UpcomingTournaments`](src/components/home/UpcomingTournaments.tsx:1).
   - Query `tournaments.status in ('upcoming','registration','ongoing')` + `date` + `location` + `max_players` + `current_participants` (via `registrations`).
   - Boutons :
     - `S'inscrire` → `/tournaments/[slug]/register` (si `registration` et pas complet).
     - `Accéder` → `/tournoi/en-cours?tournament=ID`.
   - Remplacer la section actuelle de sidebar dans [`src/app/page.tsx`](src/app/page.tsx:1) par ce composant.

5. **Module Contact**
   - Créer [`ContactModule`](src/components/home/ContactModule.tsx:1) et l’intégrer dans la sidebar.

6. **Page démo**
   - Créer [`/demo`](src/app/demo/page.tsx:1) avec données fictives, même UI que la home réelle.
   - Bandeau « Page de démo » + lien retour `/`.

7. **Dépendances**
   - Installer `date-fns`.
   - Formatage date FR dans [`UpcomingTournaments`](src/components/home/UpcomingTournaments.tsx:1).

8. **Checklist de validation**
   - Stats réelles visibles, formatage FR ok.
   - Tournois à venir triés par date, statuts affichés, règles `S'inscrire`/`Accéder`.
   - Page `/demo` rendue correctement.
   - Responsive : 2 colonnes desktop, 1 colonne mobile.
