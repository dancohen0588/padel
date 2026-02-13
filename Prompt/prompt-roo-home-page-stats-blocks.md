# Prompt Roo : Brancher les statistiques réelles sur la page d'accueil

## Contexte du projet

**Stack technique :**
- Next.js 14+ avec App Router
- TypeScript strict
- PostgreSQL via Neon avec bibliothèque `postgres`
- Tailwind CSS
- Design : Proposition 3 - Hybride (Orange #ff6b35→#ff8c42, Violet #9D7AFA, Dark #1E1E2E)

**État actuel :**
La page d'accueil (`src/app/page.tsx` ou route racine) affiche actuellement :
- ✅ Stats en haut (nombre de tournois, matchs, joueurs, sets) → DÉJÀ BRANCHÉES avec données réelles
- ❌ 4 blocs en dessous → ACTUELLEMENT MOCKÉS, À BRANCHER AVEC DONNÉES RÉELLES

## Objectif

Brancher les 4 blocs suivants avec les données réelles de la base de données :

### 1. Derniers vainqueurs (3 derniers tournois)
**Données à récupérer :**
- Les 3 tournois les plus récents (ORDER BY date DESC LIMIT 3)
- Pour chaque tournoi : nom du tournoi, date, et la paire de joueurs vainqueurs
- Le vainqueur est l'équipe (team) qui a gagné le dernier match de playoff (finale)

**Requête SQL suggérée :**
```sql
SELECT
  t.name as tournament_name,
  t.date as tournament_date,
  t.id as tournament_id,
  winner_team.id as winning_team_id,
  p1.name as player1_name,
  p1.photo_url as player1_photo,
  p2.name as player2_name,
  p2.photo_url as player2_photo
FROM tournaments t
LEFT JOIN LATERAL (
  -- Trouver le match de finale (round le plus élevé du tournoi)
  SELECT pm.winner_team_id
  FROM playoff_matches pm
  JOIN playoff_rounds pr ON pm.playoff_round_id = pr.id
  WHERE pr.tournament_id = t.id
  ORDER BY pr.round_number DESC
  LIMIT 1
) finale ON true
LEFT JOIN teams winner_team ON finale.winner_team_id = winner_team.id
LEFT JOIN team_players tp1 ON tp1.team_id = winner_team.id
LEFT JOIN players p1 ON tp1.player_id = p1.id
LEFT JOIN team_players tp2 ON tp2.team_id = winner_team.id AND tp2.player_id != p1.id
LEFT JOIN players p2 ON tp2.player_id = p2.id
WHERE t.status = 'published'
ORDER BY t.date DESC
LIMIT 3;
```

### 2. Match le plus serré du dernier tournoi
**Données à récupérer :**
- Le dernier tournoi (ORDER BY date DESC LIMIT 1)
- Le match (pool ou playoff) avec le plus grand nombre de sets
- Les 2 équipes du match avec leurs joueurs
- Le score du match

**Requête SQL suggérée :**
```sql
-- Union des matches de poules et de playoffs du dernier tournoi
WITH dernier_tournoi AS (
  SELECT id, name, date
  FROM tournaments
  WHERE status = 'published'
  ORDER BY date DESC
  LIMIT 1
),
matches_poules AS (
  SELECT
    m.id as match_id,
    'pool' as match_type,
    m.team_a_id,
    m.team_b_id,
    m.team_a_score,
    m.team_b_score,
    COUNT(ms.id) as nb_sets
  FROM matches m
  JOIN pools p ON m.pool_id = p.id
  JOIN dernier_tournoi dt ON p.tournament_id = dt.id
  LEFT JOIN match_sets ms ON ms.match_id = m.id
  GROUP BY m.id
),
matches_playoffs AS (
  SELECT
    pm.id as match_id,
    'playoff' as match_type,
    pm.team_a_id,
    pm.team_b_id,
    pm.team_a_score,
    pm.team_b_score,
    COUNT(ps.id) as nb_sets
  FROM playoff_matches pm
  JOIN playoff_rounds pr ON pm.playoff_round_id = pr.id
  JOIN dernier_tournoi dt ON pr.tournament_id = dt.id
  LEFT JOIN playoff_sets ps ON ps.playoff_match_id = pm.id
  GROUP BY pm.id
),
tous_matches AS (
  SELECT * FROM matches_poules
  UNION ALL
  SELECT * FROM matches_playoffs
)
SELECT
  tm.*,
  t1.id as team_a_id,
  p1a.name as player1a_name,
  p2a.name as player2a_name,
  t2.id as team_b_id,
  p1b.name as player1b_name,
  p2b.name as player2b_name
FROM tous_matches tm
JOIN teams t1 ON tm.team_a_id = t1.id
JOIN team_players tp1a ON tp1a.team_id = t1.id
JOIN players p1a ON tp1a.player_id = p1a.id
JOIN team_players tp2a ON tp2a.team_id = t1.id AND tp2a.player_id != p1a.id
JOIN players p2a ON tp2a.player_id = p2a.id
JOIN teams t2 ON tm.team_b_id = t2.id
JOIN team_players tp1b ON tp1b.team_id = t2.id
JOIN players p1b ON tp1b.player_id = p1b.id
JOIN team_players tp2b ON tp2b.team_id = t2.id AND tp2b.player_id != p1b.id
JOIN players p2b ON tp2b.player_id = p2b.id
ORDER BY tm.nb_sets DESC
LIMIT 1;
```

### 3. Top paires - Victoires totales
**Données à récupérer :**
- Les 5 paires (teams) avec le plus de victoires tous tournois confondus
- Compter les victoires de matches de poules ET de playoffs
- Afficher : noms des 2 joueurs, nombre de victoires, peut-être nombre de tournois joués

**Requête SQL suggérée :**
```sql
WITH victoires_poules AS (
  SELECT
    m.winner_team_id as team_id,
    COUNT(*) as nb_victoires
  FROM matches m
  WHERE m.winner_team_id IS NOT NULL
  GROUP BY m.winner_team_id
),
victoires_playoffs AS (
  SELECT
    pm.winner_team_id as team_id,
    COUNT(*) as nb_victoires
  FROM playoff_matches pm
  WHERE pm.winner_team_id IS NOT NULL
  GROUP BY pm.winner_team_id
),
victoires_totales AS (
  SELECT
    COALESCE(vp.team_id, vpl.team_id) as team_id,
    COALESCE(vp.nb_victoires, 0) + COALESCE(vpl.nb_victoires, 0) as total_victoires
  FROM victoires_poules vp
  FULL OUTER JOIN victoires_playoffs vpl ON vp.team_id = vpl.team_id
)
SELECT
  vt.team_id,
  vt.total_victoires,
  p1.name as player1_name,
  p1.photo_url as player1_photo,
  p2.name as player2_name,
  p2.photo_url as player2_photo,
  COUNT(DISTINCT t.tournament_id) as nb_tournois
FROM victoires_totales vt
JOIN teams t ON vt.team_id = t.id
JOIN team_players tp1 ON tp1.team_id = t.id
JOIN players p1 ON tp1.player_id = p1.id
JOIN team_players tp2 ON tp2.team_id = t.id AND tp2.player_id != p1.id
JOIN players p2 ON tp2.player_id = p2.id
GROUP BY vt.team_id, vt.total_victoires, p1.id, p1.name, p1.photo_url, p2.id, p2.name, p2.photo_url
ORDER BY vt.total_victoires DESC
LIMIT 5;
```

### 4. Top joueurs - Victoires individuelles
**Données à récupérer :**
- Les 5 joueurs individuels avec le plus de victoires (en comptant toutes les victoires de leurs équipes)
- Un joueur peut jouer dans plusieurs paires différentes
- Afficher : nom du joueur, photo, nombre de victoires, nombre de tournois

**Requête SQL suggérée :**
```sql
WITH victoires_equipes AS (
  -- Victoires de poules
  SELECT m.winner_team_id as team_id
  FROM matches m
  WHERE m.winner_team_id IS NOT NULL
  UNION ALL
  -- Victoires de playoffs
  SELECT pm.winner_team_id as team_id
  FROM playoff_matches pm
  WHERE pm.winner_team_id IS NOT NULL
),
victoires_par_joueur AS (
  SELECT
    tp.player_id,
    COUNT(*) as nb_victoires
  FROM victoires_equipes ve
  JOIN team_players tp ON ve.team_id = tp.team_id
  GROUP BY tp.player_id
)
SELECT
  p.id as player_id,
  p.name as player_name,
  p.photo_url as player_photo,
  vp.nb_victoires,
  COUNT(DISTINCT t.tournament_id) as nb_tournois
FROM victoires_par_joueur vp
JOIN players p ON vp.player_id = p.id
JOIN team_players tp ON tp.player_id = p.id
JOIN teams t ON tp.team_id = t.id
GROUP BY p.id, p.name, p.photo_url, vp.nb_victoires
ORDER BY vp.nb_victoires DESC
LIMIT 5;
```

## Structure de fichiers suggérée

```
src/
├── app/
│   └── page.tsx                          # Page d'accueil (à modifier)
├── components/
│   └── home/
│       ├── HomeHero.tsx                  # Stats du haut (DÉJÀ FAIT)
│       ├── UpcomingTournaments.tsx       # Prochains tournois (DÉJÀ FAIT)
│       ├── RecentWinners.tsx             # Nouveau composant
│       ├── ClosestMatch.tsx              # Nouveau composant
│       ├── TopTeams.tsx                  # Nouveau composant
│       └── TopPlayers.tsx                # Nouveau composant
└── lib/
    └── queries/
        └── home-stats.ts                 # Nouvelles fonctions de requêtes
```

## Types TypeScript à créer

```typescript
// Dans src/types/home-stats.ts ou directement dans les composants

export type RecentWinner = {
  tournament_name: string;
  tournament_date: string;
  tournament_id: string;
  player1_name: string;
  player1_photo: string | null;
  player2_name: string;
  player2_photo: string | null;
};

export type ClosestMatch = {
  match_id: string;
  match_type: 'pool' | 'playoff';
  nb_sets: number;
  team_a_score: number;
  team_b_score: number;
  player1a_name: string;
  player2a_name: string;
  player1b_name: string;
  player2b_name: string;
};

export type TopTeam = {
  team_id: string;
  total_victoires: number;
  player1_name: string;
  player1_photo: string | null;
  player2_name: string;
  player2_photo: string | null;
  nb_tournois: number;
};

export type TopPlayer = {
  player_id: string;
  player_name: string;
  player_photo: string | null;
  nb_victoires: number;
  nb_tournois: number;
};
```

## Design à respecter

**Charte graphique Proposition 3 - Hybride :**
- Couleur principale : Orange dégradé `#ff6b35` → `#ff8c42`
- Couleur secondaire : Violet `#9D7AFA`
- Fond sombre : `#1E1E2E`
- Texte : blanc ou gris clair

**Structure des cartes :**
- Chaque bloc doit être dans une carte avec fond sombre semi-transparent
- Border radius : `rounded-xl` ou `rounded-2xl`
- Ombre portée : `shadow-lg`
- Padding intérieur : `p-6` ou `p-8`
- Titres en orange avec icône
- Utiliser `lucide-react` pour les icônes : `Trophy`, `Target`, `Users`, `User`

**Layout de la page :**
```tsx
// Structure suggérée de la page
<div className="container mx-auto px-4 py-12">
  {/* Stats du haut - DÉJÀ FAIT */}
  <HomeHero />

  {/* Prochains tournois - DÉJÀ FAIT */}
  <UpcomingTournaments />

  {/* Nouveaux blocs à ajouter */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
    {/* Derniers vainqueurs */}
    <RecentWinners />

    {/* Match le plus serré */}
    <ClosestMatch />
  </div>

  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
    {/* Top paires */}
    <TopTeams />

    {/* Top joueurs */}
    <TopPlayers />
  </div>
</div>
```

## Instructions d'implémentation

### Étape 1 : Créer les fonctions de requêtes
Créer `src/lib/queries/home-stats.ts` avec les 4 fonctions :
```typescript
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

export async function getRecentWinners() {
  // Implémenter la requête SQL 1
}

export async function getClosestMatch() {
  // Implémenter la requête SQL 2
}

export async function getTopTeams() {
  // Implémenter la requête SQL 3
}

export async function getTopPlayers() {
  // Implémenter la requête SQL 4
}
```

### Étape 2 : Créer les composants React

**RecentWinners.tsx :**
- Afficher les 3 derniers tournois avec leurs vainqueurs
- Pour chaque tournoi : titre, date formatée (utiliser `date-fns` avec locale français)
- Photos des joueurs en mode duo (côte à côte)
- Icône `Trophy` pour le titre du bloc

**ClosestMatch.tsx :**
- Afficher le match le plus serré
- Montrer les 2 équipes face à face
- Score mis en évidence
- Nombre de sets joués
- Icône `Target` pour le titre

**TopTeams.tsx :**
- Liste des 5 meilleures paires
- Pour chaque paire : photos des joueurs, noms, nombre de victoires
- Badge avec le nombre de tournois joués
- Icône `Users` pour le titre

**TopPlayers.tsx :**
- Liste des 5 meilleurs joueurs
- Pour chaque joueur : photo, nom, nombre de victoires
- Badge avec le nombre de tournois
- Icône `User` pour le titre

### Étape 3 : Intégrer dans la page d'accueil
Modifier `src/app/page.tsx` pour :
- Importer les 4 nouveaux composants
- Les appeler avec `await` (Server Components)
- Gérer les cas où il n'y a pas de données (afficher un message approprié)

### Étape 4 : Gestion des images
- Si `photo_url` est null, afficher un avatar par défaut ou les initiales du joueur
- Utiliser `next/image` avec `Image` component pour l'optimisation
- Prévoir un fallback pour les images manquantes

## Points d'attention

1. **Performance** : Toutes les requêtes SQL doivent être optimisées (vérifier les index sur tournament_id, team_id, player_id)

2. **Cas limites** :
   - Que faire si aucun tournoi n'a été joué ?
   - Que faire si un tournoi n'a pas de finale ?
   - Que faire si une équipe n'a que 1 joueur dans team_players ?

3. **Formatage des dates** :
   - Utiliser `date-fns` avec `format(date, 'dd MMMM yyyy', { locale: fr })`
   - Importer : `import { format } from 'date-fns'; import { fr } from 'date-fns/locale';`

4. **Tests** :
   - Vérifier que les requêtes renvoient bien les bonnes données
   - Tester avec la base de données seedée (script `seed-database-v2.ts`)

5. **Cohérence** :
   - S'assurer que le style des nouveaux composants est cohérent avec `HomeHero` et `UpcomingTournaments` existants
   - Réutiliser les classes Tailwind communes

## Exemple de composant complet

```tsx
// src/components/home/RecentWinners.tsx
import { Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Image from 'next/image';
import { getRecentWinners } from '@/lib/queries/home-stats';

export default async function RecentWinners() {
  const winners = await getRecentWinners();

  if (!winners || winners.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#1E1E2E] rounded-2xl p-8 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-6 h-6 text-[#ff6b35]" />
        <h2 className="text-2xl font-bold text-white">Derniers vainqueurs</h2>
      </div>

      <div className="space-y-6">
        {winners.map((winner) => (
          <div key={winner.tournament_id} className="border-l-4 border-[#ff6b35] pl-4">
            <h3 className="text-lg font-semibold text-white">{winner.tournament_name}</h3>
            <p className="text-sm text-gray-400 mb-3">
              {format(new Date(winner.tournament_date), 'dd MMMM yyyy', { locale: fr })}
            </p>

            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                <Image
                  src={winner.player1_photo || '/default-avatar.png'}
                  alt={winner.player1_name}
                  width={40}
                  height={40}
                  className="rounded-full border-2 border-[#1E1E2E]"
                />
                <Image
                  src={winner.player2_photo || '/default-avatar.png'}
                  alt={winner.player2_name}
                  width={40}
                  height={40}
                  className="rounded-full border-2 border-[#1E1E2E]"
                />
              </div>
              <div>
                <p className="text-white font-medium">
                  {winner.player1_name} & {winner.player2_name}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Checklist de validation

- [ ] Les 4 requêtes SQL sont testées et renvoient les bonnes données
- [ ] Les 4 composants sont créés et stylisés selon la charte
- [ ] Les types TypeScript sont définis
- [ ] La page d'accueil intègre les nouveaux composants
- [ ] Les images ont un fallback pour les photos manquantes
- [ ] Les dates sont formatées en français
- [ ] Les cas limites sont gérés (pas de données)
- [ ] Le responsive est vérifié (mobile, tablette, desktop)
- [ ] Les performances sont bonnes (pas de requêtes N+1)
- [ ] Le code respecte les conventions du projet (import paths, naming, etc.)

## Commande pour tester

Après implémentation, relancer le serveur :
```bash
npm run dev
```

Puis visiter : `http://localhost:3000/` et vérifier que tous les blocs affichent les bonnes données.
