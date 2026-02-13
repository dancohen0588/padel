# Prompt Roo : Implémentation de la page d'accueil avec KPIs

## Contexte
Implémentation de la nouvelle page d'accueil du projet "Le tournoi des frérots" avec un système complet de KPIs (indicateurs de performance) pour les paires, les joueurs individuels, et les statistiques de tournois.

## Référence Design
Le design de référence se trouve dans `/mnt/padel/home-page-kpi-design-v2.html`

## Charte graphique (Proposition 3 - Hybride)
- Orange principal : #ff6b35 → #ff8c42 (gradient)
- Vert : #4CAF50
- Violet : #9D7AFA
- Jaune : #FFDA77
- Fond sombre : #1E1E2E
- Backgrounds avec transparence : bg-white/5, bg-white/10
- Bordures subtiles : border-white/10

## Objectifs

### 1. Structure de la page
Créer `src/app/page.tsx` (page d'accueil) avec :
- Section hero panoramique (220px hauteur, pleine largeur)
- Stats globales en overlay dans le hero
- Layout 2 colonnes : contenu principal + sidebar (300px)
- Tout le contenu principal visible sans scroll sur écran 13 pouces

### 2. Section Hero
```tsx
- Photo de fond panoramique (placeholder pour l'instant)
- 4 stats en overlay :
  * Nombre total de tournois
  * Nombre total de matchs joués
  * Nombre total de joueurs
  * Nombre total de sets joués
- Background gradient overlay pour la lisibilité
- Height fixe : 220px
```

### 3. Podium des Champions (Paires)
```tsx
- Top 3 paires par nombre de victoires en tournoi
- Pour chaque paire :
  * 2 photos circulaires (36px) avec bordure orange
  * Nom de la paire
  * Badge de position (1er, 2ème, 3ème)
  * Statistiques : Tournois gagnés, Ratio victoires, Sets gagnés
- Cards avec effet hover et dégradé selon position
```

### 4. Classement des Paires
```tsx
- Top 10 paires classées par :
  1. Nombre de victoires en tournoi (priorité)
  2. Total de matchs gagnés (si égalité)
  3. Ratio de sets gagnés (si égalité)
- Affichage :
  * Position (#1, #2, etc.)
  * 2 photos superposées (margin-left: -12px pour effet overlap)
  * Nom de la paire
  * Stats : Victoires tournoi / Total matchs / Ratio sets
- 4 premiers avec badge "seed" orange
```

### 5. Classement des Joueurs Individuels
```tsx
- Top 10 joueurs classés par :
  1. Nombre de victoires en tournoi individuelles
  2. Total de matchs gagnés individuels
  3. Ratio de sets gagnés
- Affichage :
  * Position (#1, #2, etc.)
  * 1 photo circulaire (48px)
  * Nom du joueur
  * Stats : Victoires / Matchs / Ratio
```

### 6. Match le Plus Serré
```tsx
- 1 carte mise en avant avec le match le plus disputé
- Critères : match avec le plus grand nombre de jeux joués sur l'ensemble des sets
- Affichage :
  * 2 équipes face à face avec photos (32px)
  * Score final en sets
  * Détail de chaque set (6-4, 7-6, etc.)
  * Badge "Match le plus serré"
  * Date et nom du tournoi
```

### 7. KPIs Supplémentaires (Sections additionnelles)

#### Séries de Victoires
```tsx
- Plus longue série de victoires consécutives (paire)
- Plus longue série actuelle
- Affichage : Nom paire, nombre matchs, période
```

#### Records de Remontées
```tsx
- Plus grande remontée (perdre le 1er set puis gagner le match)
- Affichage : Match concerné, score sets, date
```

#### Polyvalence
```tsx
- Joueurs ayant joué avec le plus de partenaires différents
- Affichage : Nom joueur, nombre partenaires, photo
```

#### Rivalités
```tsx
- Paires s'étant affrontées le plus souvent
- Affichage : 2 paires face à face, nombre de confrontations, ratio victoires
```

### 8. Sidebar
```tsx
- Module "Prochains Tournois" (existant, à maintenir discrètement)
  * Liste compacte des tournois à venir
  * Date, nom, statut
  * Lien vers la page du tournoi

- Module "On se rejoint ?" (existant, à maintenir)
  * Formulaire de contact/inscription
  * Design compact
```

## Implémentation Technique

### Base de données - Requêtes nécessaires

#### 1. Stats Globales (Hero)
```typescript
// Compter tous les tournois
const totalTournaments = await db
  .select({ count: count() })
  .from(tournaments)
  .where(eq(tournaments.status, 'completed'));

// Compter tous les matchs
const totalMatches = await db
  .select({ count: count() })
  .from(matches);

// Compter joueurs uniques
const totalPlayers = await db
  .select({ count: countDistinct(participations.user_id) })
  .from(participations);

// Compter tous les sets
const totalSets = await db
  .select({ count: count() })
  .from(sets);
```

#### 2. Classement des Paires
```typescript
// Logique complexe nécessitant :
// 1. Grouper les participations par équipe (team_id)
// 2. Pour chaque équipe, calculer :
//    - Tournois gagnés (compter les tournaments où cette team a le winner_id)
//    - Matchs gagnés (compter les matches où team_id = winner_id)
//    - Sets gagnés (via les relations matches -> sets)
// 3. Récupérer les 2 joueurs de chaque équipe avec leurs photos
// 4. Calculer le ratio de sets (sets_won / sets_played)
// 5. Trier par : tournamentsWon DESC, matchesWon DESC, setsRatio DESC

async function getPairRankings() {
  // Étape 1 : Récupérer toutes les équipes avec leurs statistiques
  const teamsWithStats = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      // Sous-requêtes pour les stats
    })
    .from(teams)
    .leftJoin(matches, eq(matches.team1_id, teams.id))
    // ... jointures complexes
    .groupBy(teams.id)
    .limit(10);

  // Étape 2 : Pour chaque équipe, récupérer les 2 joueurs
  const enrichedTeams = await Promise.all(
    teamsWithStats.map(async (team) => {
      const players = await db
        .select({
          userId: users.id,
          name: users.name,
          photo: users.photo_url,
        })
        .from(team_members)
        .innerJoin(users, eq(users.id, team_members.user_id))
        .where(eq(team_members.team_id, team.teamId))
        .limit(2);

      return {
        ...team,
        players,
      };
    })
  );

  return enrichedTeams;
}
```

#### 3. Classement des Joueurs Individuels
```typescript
// Pour chaque joueur :
// 1. Compter les tournois gagnés (via teams dont ils sont membres)
// 2. Compter les matchs gagnés (via teams)
// 3. Calculer le ratio de sets
// 4. Récupérer leur photo

async function getPlayerRankings() {
  const players = await db
    .select({
      userId: users.id,
      name: users.name,
      photo: users.photo_url,
      // Statistiques via sous-requêtes
    })
    .from(users)
    .orderBy(desc(/* tournois gagnés */))
    .limit(10);

  return players;
}
```

#### 4. Match le Plus Serré
```typescript
// 1. Pour chaque match completed, calculer le total de jeux joués
// 2. Sélectionner le match avec le plus grand total
// 3. Récupérer les détails : équipes, joueurs, sets, date, tournoi

async function getTightestMatch() {
  const match = await db
    .select({
      matchId: matches.id,
      team1: teams.name,
      team2: teams.name,
      // ... détails
    })
    .from(matches)
    .innerJoin(sets, eq(sets.match_id, matches.id))
    .where(eq(matches.status, 'completed'))
    .groupBy(matches.id)
    .orderBy(desc(sum(sets.team1_score + sets.team2_score)))
    .limit(1);

  // Enrichir avec les joueurs et leurs photos
  return enrichedMatch;
}
```

#### 5. Séries de Victoires
```typescript
// Algorithme complexe :
// 1. Récupérer tous les matchs par équipe, ordonnés par date
// 2. Pour chaque équipe, parcourir les matchs et calculer les streaks
// 3. Identifier la plus longue série de victoires consécutives
// 4. Identifier la série actuelle (si le dernier match est une victoire)

async function getWinStreaks() {
  // Pseudo-code :
  // Pour chaque team :
  //   matches = getMatchesOrderedByDate(teamId)
  //   currentStreak = 0
  //   maxStreak = 0
  //   for match in matches:
  //     if match.winner_id === teamId:
  //       currentStreak++
  //       maxStreak = max(maxStreak, currentStreak)
  //     else:
  //       currentStreak = 0

  return {
    longestStreak: { team, count, period },
    currentStreak: { team, count },
  };
}
```

#### 6. Remontées (Comebacks)
```typescript
// Pour chaque match en 3 sets :
// 1. Identifier les matchs où une équipe a perdu le set 1 mais gagné le match
// 2. Calculer l'écart (exemple : perd 6-1 puis gagne 6-0, 6-0)
// 3. Trier par "impressiveness" (écart dans les scores)

async function getBestComebacks() {
  const matches = await db
    .select({
      matchId: matches.id,
      winnerId: matches.winner_id,
      sets: sets,
    })
    .from(matches)
    .innerJoin(sets, eq(sets.match_id, matches.id))
    .where(eq(matches.status, 'completed'))
    .groupBy(matches.id);

  // Filtrer les comebacks (set 1 perdu, match gagné)
  const comebacks = matches.filter(match => {
    const firstSet = match.sets[0];
    const isFirstSetLost =
      (match.winnerId === match.team1_id && firstSet.team2_score > firstSet.team1_score) ||
      (match.winnerId === match.team2_id && firstSet.team1_score > firstSet.team2_score);
    return isFirstSetLost;
  });

  return comebacks[0]; // Le plus impressionnant
}
```

#### 7. Polyvalence
```typescript
// Pour chaque joueur :
// 1. Compter le nombre de team_id distincts dans lesquels ils ont joué
// 2. Trier par nombre de partenaires différents

async function getMostVersatilePlayers() {
  const players = await db
    .select({
      userId: users.id,
      name: users.name,
      photo: users.photo_url,
      partnerCount: countDistinct(team_members.team_id),
    })
    .from(users)
    .innerJoin(team_members, eq(team_members.user_id, users.id))
    .groupBy(users.id)
    .orderBy(desc(countDistinct(team_members.team_id)))
    .limit(5);

  return players;
}
```

#### 8. Rivalités
```typescript
// Pour chaque paire d'équipes :
// 1. Compter le nombre de fois où elles se sont affrontées
// 2. Calculer le ratio victoires/défaites
// 3. Trier par nombre de confrontations

async function getRivalries() {
  // Complexe car nécessite de regarder team1_id vs team2_id dans les deux sens
  const rivalries = await db
    .select({
      team1Id: matches.team1_id,
      team2Id: matches.team2_id,
      matchCount: count(),
      team1Wins: sum(case(eq(matches.winner_id, matches.team1_id), 1, 0)),
    })
    .from(matches)
    .where(eq(matches.status, 'completed'))
    .groupBy(matches.team1_id, matches.team2_id)
    .having(gte(count(), 3)) // Au moins 3 confrontations
    .orderBy(desc(count()))
    .limit(5);

  return enrichedRivalries; // Avec noms équipes et photos joueurs
}
```

### Structure des Composants

```
src/app/page.tsx (Server Component)
  ├── Requêtes DB pour tous les KPIs
  ├── <HomeHero stats={globalStats} />
  ├── <div className="layout-2-cols">
  │     ├── <main>
  │     │     ├── <ChampionsPodium pairs={top3Pairs} />
  │     │     ├── <PairRankings pairs={top10Pairs} />
  │     │     ├── <PlayerRankings players={top10Players} />
  │     │     ├── <TightestMatch match={tightestMatch} />
  │     │     ├── <WinStreaks data={winStreaks} />
  │     │     ├── <BestComebacks comebacks={comebacks} />
  │     │     ├── <Polyvalence players={versatilePlayers} />
  │     │     └── <Rivalries rivalries={rivalries} />
  │     └── <aside>
  │           ├── <UpcomingTournaments tournaments={upcoming} />
  │           └── <ContactModule />

src/components/home/
  ├── HomeHero.tsx
  ├── ChampionsPodium.tsx
  ├── PairRankings.tsx
  ├── PlayerRankings.tsx
  ├── TightestMatch.tsx
  ├── WinStreaks.tsx
  ├── BestComebacks.tsx
  ├── Polyvalence.tsx
  ├── Rivalries.tsx
  ├── UpcomingTournaments.tsx
  └── ContactModule.tsx

src/components/ui/
  ├── PlayerPhoto.tsx (avatar circulaire avec fallback initiales)
  └── TeamPhotos.tsx (2 avatars superposés)
```

### Composant PlayerPhoto
```tsx
// src/components/ui/PlayerPhoto.tsx
type PlayerPhotoProps = {
  name: string;
  photoUrl?: string | null;
  size?: number; // px
  className?: string;
};

export function PlayerPhoto({
  name,
  photoUrl,
  size = 48,
  className
}: PlayerPhotoProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={cn(
          "rounded-full border-2 border-orange-500 object-cover",
          className
        )}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full border-2 border-orange-500 bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4
      }}
    >
      {initials}
    </div>
  );
}
```

### Composant TeamPhotos
```tsx
// src/components/ui/TeamPhotos.tsx
type TeamPhotosProps = {
  player1: { name: string; photoUrl?: string | null };
  player2: { name: string; photoUrl?: string | null };
  size?: number;
  className?: string;
};

export function TeamPhotos({
  player1,
  player2,
  size = 36,
  className
}: TeamPhotosProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <PlayerPhoto
        name={player1.name}
        photoUrl={player1.photoUrl}
        size={size}
      />
      <PlayerPhoto
        name={player2.name}
        photoUrl={player2.photoUrl}
        size={size}
        className="-ml-3" // Overlap effect
      />
    </div>
  );
}
```

### Exemple de Composant ChampionsPodium
```tsx
// src/components/home/ChampionsPodium.tsx
"use client";

import { TeamPhotos } from "@/components/ui/TeamPhotos";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type PairStats = {
  teamId: string;
  teamName: string;
  player1: { name: string; photoUrl?: string | null };
  player2: { name: string; photoUrl?: string | null };
  tournamentsWon: number;
  matchesWon: number;
  matchesPlayed: number;
  setsWon: number;
  setsPlayed: number;
};

type ChampionsPodiumProps = {
  pairs: [PairStats, PairStats, PairStats];
};

export function ChampionsPodium({ pairs }: ChampionsPodiumProps) {
  const positions = [
    { rank: 1, label: "1er", gradient: "from-orange-500 to-orange-400", height: "h-64" },
    { rank: 2, label: "2ème", gradient: "from-white/20 to-white/10", height: "h-56" },
    { rank: 3, label: "3ème", gradient: "from-white/15 to-white/5", height: "h-48" },
  ];

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-orange-500" />
        Podium des Champions
      </h2>
      <div className="grid grid-cols-3 gap-4">
        {pairs.map((pair, index) => {
          const pos = positions[index];
          const winRate = ((pair.matchesWon / pair.matchesPlayed) * 100).toFixed(0);
          const setsRatio = ((pair.setsWon / pair.setsPlayed) * 100).toFixed(0);

          return (
            <div
              key={pair.teamId}
              className={cn(
                "rounded-xl border border-white/10 bg-gradient-to-b p-6 transition-all hover:-translate-y-1 hover:shadow-2xl",
                pos.gradient,
                pos.height
              )}
            >
              <div className="flex flex-col items-center h-full">
                <div className="mb-3 text-xs font-bold uppercase tracking-wider text-white/60">
                  {pos.label}
                </div>

                <TeamPhotos
                  player1={pair.player1}
                  player2={pair.player2}
                  size={48}
                  className="mb-3"
                />

                <h3 className="text-center text-lg font-bold text-white mb-4">
                  {pair.teamName}
                </h3>

                <div className="mt-auto w-full space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
                    <span className="text-xs text-white/60">Tournois</span>
                    <span className="text-sm font-bold text-white">{pair.tournamentsWon}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
                    <span className="text-xs text-white/60">Ratio victoires</span>
                    <span className="text-sm font-bold text-emerald-400">{winRate}%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
                    <span className="text-xs text-white/60">Sets gagnés</span>
                    <span className="text-sm font-bold text-white">{pair.setsWon}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

### Layout Principal avec Sidebar
```tsx
// src/app/page.tsx (extrait)
<div className="min-h-screen bg-[#1E1E2E]">
  <HomeHero stats={globalStats} />

  <div className="container mx-auto px-4 py-8">
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
      {/* Colonne principale */}
      <main className="space-y-8">
        <ChampionsPodium pairs={top3Pairs} />
        <PairRankings pairs={top10Pairs} />
        <PlayerRankings players={top10Players} />
        <TightestMatch match={tightestMatch} />
        <WinStreaks data={winStreaks} />
        <BestComebacks comebacks={comebacks} />
        <Polyvalence players={versatilePlayers} />
        <Rivalries rivalries={rivalries} />
      </main>

      {/* Sidebar */}
      <aside className="space-y-6">
        <UpcomingTournaments tournaments={upcoming} />
        <ContactModule />
      </aside>
    </div>
  </div>
</div>
```

## Gestion des Photos

### Schéma Database (à ajouter si nécessaire)
```sql
-- Ajouter colonne photo_url dans users si pas déjà présente
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Ajouter colonne photo_url dans teams si nécessaire
ALTER TABLE teams ADD COLUMN IF NOT EXISTS photo_url TEXT;
```

### Upload de Photos (optionnel, peut être fait plus tard)
Pour l'instant, utiliser des placeholders SVG avec initiales. Plus tard :
- Utiliser Supabase Storage pour stocker les images
- Créer une page d'administration pour upload des photos
- Optimiser les images avec Next.js Image component

## Optimisations Performance

### 1. Caching
```tsx
// src/app/page.tsx
export const revalidate = 300; // Revalider toutes les 5 minutes

// Ou utiliser unstable_cache pour des requêtes spécifiques
import { unstable_cache } from 'next/cache';

const getCachedPairRankings = unstable_cache(
  async () => getPairRankings(),
  ['pair-rankings'],
  { revalidate: 300 }
);
```

### 2. Parallel Queries
```tsx
// Exécuter toutes les requêtes en parallèle
const [
  globalStats,
  top3Pairs,
  top10Pairs,
  top10Players,
  tightestMatch,
  winStreaks,
  comebacks,
  versatilePlayers,
  rivalries,
  upcoming
] = await Promise.all([
  getGlobalStats(),
  getTop3Pairs(),
  getPairRankings(),
  getPlayerRankings(),
  getTightestMatch(),
  getWinStreaks(),
  getBestComebacks(),
  getMostVersatilePlayers(),
  getRivalries(),
  getUpcomingTournaments(),
]);
```

### 3. Indexes Database
```sql
-- Optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_matches_winner ON matches(winner_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_sets_match ON sets(match_id);
```

## Points d'Attention

1. **Gestion des données manquantes** :
   - Certains KPIs peuvent être vides au début (pas assez de data)
   - Afficher des placeholders ou messages explicatifs
   - Exemple : "Aucune rivalité détectée pour le moment"

2. **Calculs complexes** :
   - Les séries de victoires et remontées nécessitent du traitement en mémoire
   - Envisager de créer des tables précalculées (materialized views) si performance insuffisante

3. **Photos** :
   - Toujours avoir un fallback avec initiales
   - Utiliser Next.js Image pour l'optimisation
   - Formats acceptés : JPG, PNG, WebP

4. **Responsive** :
   - Sur mobile, passer en colonne unique
   - Réduire la taille du hero (120px au lieu de 220px)
   - Adapter le podium en cards verticales

5. **Tests** :
   - Tester avec 0 tournois (nouveau système)
   - Tester avec 1 seul tournoi
   - Tester avec beaucoup de données (>50 tournois)

## Ordre d'Implémentation Suggéré

1. **Phase 1 : Structure de base**
   - Créer page.tsx avec layout 2 colonnes
   - Implémenter HomeHero avec stats globales (requêtes simples)
   - Créer PlayerPhoto et TeamPhotos components

2. **Phase 2 : Classements principaux**
   - Implémenter getPairRankings() et PairRankings component
   - Implémenter getPlayerRankings() et PlayerRankings component
   - Implémenter ChampionsPodium (utilise les mêmes données que PairRankings)

3. **Phase 3 : Stats avancées**
   - Match le plus serré
   - Séries de victoires
   - Remontées

4. **Phase 4 : KPIs bonus**
   - Polyvalence
   - Rivalités

5. **Phase 5 : Sidebar**
   - Prochains tournois (peut réutiliser code existant)
   - Module "On se rejoint ?"

6. **Phase 6 : Polish**
   - Animations et transitions
   - Optimisation performance
   - Tests responsive
   - Gestion des états vides

## Questions à Clarifier

- [ ] Doit-on afficher les stats de tous les tournois ou uniquement les completed ?
- [ ] Pour les séries de victoires, compter seulement les matchs de playoffs ou aussi les poules ?
- [ ] Faut-il exclure les tournois de test des statistiques ?
- [ ] Quelle est la priorité des KPIs ? (Tous à implémenter immédiatement ou par phases ?)
- [ ] Pour le module "On se rejoint ?", doit-il être fonctionnel (formulaire) ou juste informatif ?

## Validation

Une fois implémenté, vérifier :
- ✅ Tous les KPIs sont visibles sans scroll sur écran 13 pouces
- ✅ Les photos s'affichent correctement (ou fallback avec initiales)
- ✅ Les statistiques correspondent aux données réelles en DB
- ✅ Le design respecte la charte Proposition 3
- ✅ La page est responsive (mobile/tablet/desktop)
- ✅ Les performances sont acceptables (< 2s pour charger)
- ✅ Pas d'erreurs console
- ✅ Le hero panoramique prend toute la largeur
- ✅ Les modules sidebar sont discrets mais accessibles
