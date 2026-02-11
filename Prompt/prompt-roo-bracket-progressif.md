# Prompt Roo/ChatGPT 5.2 Codex - Bracket Progressif avec Remplissage Automatique

## 📋 Contexte

**Besoin** : Le bracket des phases finales doit s'afficher **vide dès le début** et se remplir **automatiquement** au fur et à mesure que les résultats des matchs de poules arrivent.

**Objectif** : Créer un système de génération et de mise à jour progressive du bracket basé sur les performances en phase de poules.

---

## 🎯 Fonctionnalités à implémenter

### 1. Génération du bracket vide à la création du tournoi

**Déclencheur** : Dès qu'un tournoi est créé avec l'option `playoffs.enabled = true`

**Comportement** :
- Générer toutes les structures de rounds vides (16èmes, 8èmes, quarts, demi, finale)
- Créer tous les matchs avec `team1_id = null`, `team2_id = null`
- Définir les liens de progression (`next_match_id`, `next_match_position`)
- Définir les seeds attendus pour chaque position (`team1_seed`, `team2_seed`)

**Exemple** : Pour un tournoi de 32 équipes (8 poules × 4 équipes)
```
Configuration :
- 8 poules de 4 équipes
- 2 meilleures équipes par poule se qualifient
- Total : 16 équipes qualifiées
- Phase de départ : 8èmes de finale

Bracket généré :
- 8èmes de finale : 8 matchs (16 slots vides)
- Quarts de finale : 4 matchs (8 slots vides)
- Demi-finales : 2 matchs (4 slots vides)
- Finale : 1 match (2 slots vides)
```

### 2. Calcul automatique du seeding en temps réel

**Déclencheur** : À chaque fois qu'un résultat de match de poule est enregistré

**Processus** :
1. Recalculer le classement de toutes les poules
2. Identifier les équipes qualifiées (selon la configuration)
3. Calculer le seeding global
4. Mettre à jour les slots du bracket avec les équipes qualifiées

**Critères de classement** (ordre de priorité) :
1. Points (3 pour victoire, 1 pour nul, 0 pour défaite)
2. Goal average (différence jeux gagnés - jeux perdus)
3. Nombre de victoires
4. Confrontation directe
5. Jeux marqués au total

**Exemple de seeding** :
```
Poule A : 1er → Seed #1, 2ème → Seed #9
Poule B : 1er → Seed #2, 2ème → Seed #10
Poule C : 1er → Seed #3, 2ème → Seed #11
Poule D : 1er → Seed #4, 2ème → Seed #12
Poule E : 1er → Seed #5, 2ème → Seed #13
Poule F : 1er → Seed #6, 2ème → Seed #14
Poule G : 1er → Seed #7, 2ème → Seed #15
Poule H : 1er → Seed #8, 2ème → Seed #16

Les seeds sont ensuite affinés par goal average entre équipes de même rang.
```

### 3. Affichage du bracket avec slots vides

**État initial** : Tous les slots affichent "En attente" ou "TBD"

**État progressif** : Au fur et à mesure, les slots se remplissent avec les noms d'équipes

**Design des slots vides** :
```tsx
// Slot vide
<div className="team opacity-50">
  <div className="team-info">
    <span className="seed text-white/30">1</span>
    <span className="team-name text-white/40 italic">En attente</span>
  </div>
</div>

// Slot rempli
<div className="team">
  <div className="team-info">
    <span className="seed top-seed">1</span>
    <span className="team-name">Les Champions A</span>
  </div>
</div>
```

---

## 🔧 Implémentation technique

### Étape 1 : Créer une fonction de génération du bracket vide

**Fichier** : `/src/app/actions/playoff-actions.ts`

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Génère le bracket vide des phases finales
 * À appeler à la création du tournoi ou lors de l'activation des playoffs
 */
export async function generateEmptyPlayoffBracket(tournamentId: string) {
  const supabase = createClient();

  // 1. Récupérer la configuration du tournoi
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('config')
    .eq('id', tournamentId)
    .single();

  if (!tournament?.config?.playoffs?.enabled) {
    throw new Error('Les phases finales ne sont pas activées pour ce tournoi');
  }

  const config = tournament.config;
  const poolsCount = config.pools_count || 4;
  const qualifiedPerPool = config.playoffs.qualified_per_pool || 2;
  const totalQualified = poolsCount * qualifiedPerPool;

  // 2. Déterminer le nombre de rounds
  const rounds = determineRounds(totalQualified);
  // Exemple : 16 équipes → [8èmes, Quarts, Demi, Finale]
  // Exemple : 32 équipes → [16èmes, 8èmes, Quarts, Demi, Finale]

  // 3. Créer les rounds
  const createdRounds = [];
  for (const round of rounds) {
    const { data: createdRound } = await supabase
      .from('playoff_rounds')
      .insert({
        tournament_id: tournamentId,
        round_number: round.number,
        round_name: round.name,
      })
      .select()
      .single();

    createdRounds.push(createdRound);
  }

  // 4. Générer tous les matchs vides
  const allMatches = generateEmptyMatches(createdRounds, totalQualified);

  // 5. Insérer les matchs dans la base de données
  const { data: insertedMatches } = await supabase
    .from('playoff_matches')
    .insert(allMatches)
    .select();

  // 6. Établir les liens de progression (next_match_id)
  await linkMatchProgression(supabase, insertedMatches);

  revalidatePath(`/tournaments/${tournamentId}/admin`);

  return { success: true, matchesCount: insertedMatches.length };
}

/**
 * Détermine les rounds nécessaires selon le nombre d'équipes
 */
function determineRounds(totalQualified: number) {
  const rounds = [];
  let roundNumber = 1;
  let teamsRemaining = totalQualified;

  const roundNames = {
    32: '16èmes de finale',
    16: '8èmes de finale',
    8: 'Quarts de finale',
    4: 'Demi-finales',
    2: 'Finale',
  };

  while (teamsRemaining >= 2) {
    rounds.push({
      number: roundNumber,
      name: roundNames[teamsRemaining as keyof typeof roundNames] || `Round ${roundNumber}`,
      matchCount: teamsRemaining / 2,
    });
    teamsRemaining = teamsRemaining / 2;
    roundNumber++;
  }

  return rounds;
}

/**
 * Génère la structure de tous les matchs vides avec seeds prédéfinis
 */
function generateEmptyMatches(rounds: any[], totalQualified: number) {
  const matches = [];
  let matchNumber = 1;

  // Premier round (ex: 8èmes de finale)
  const firstRound = rounds[0];
  const firstRoundMatchCount = totalQualified / 2;

  for (let i = 0; i < firstRoundMatchCount; i++) {
    // Appariement classique : Seed #1 vs #16, #8 vs #9, etc.
    const team1Seed = i + 1;
    const team2Seed = totalQualified - i;

    matches.push({
      tournament_id: rounds[0].tournament_id,
      round_id: firstRound.id,
      match_number: matchNumber++,
      team1_id: null, // Vide au départ
      team2_id: null, // Vide au départ
      team1_seed: team1Seed,
      team2_seed: team2Seed,
      winner_id: null,
      status: 'upcoming',
    });
  }

  // Rounds suivants (tous vides)
  for (let r = 1; r < rounds.length; r++) {
    const round = rounds[r];
    const matchCount = Math.pow(2, rounds.length - r - 1);

    for (let i = 0; i < matchCount; i++) {
      matches.push({
        tournament_id: round.tournament_id,
        round_id: round.id,
        match_number: matchNumber++,
        team1_id: null,
        team2_id: null,
        team1_seed: null, // Sera déterminé par les résultats précédents
        team2_seed: null,
        winner_id: null,
        status: 'upcoming',
      });
    }
  }

  return matches;
}

/**
 * Établit les liens de progression entre les matchs
 */
async function linkMatchProgression(supabase: any, matches: any[]) {
  // Regrouper par round
  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.round_id]) acc[match.round_id] = [];
    acc[match.round_id].push(match);
    return acc;
  }, {});

  const roundIds = Object.keys(matchesByRound).sort();

  // Pour chaque round sauf le dernier
  for (let i = 0; i < roundIds.length - 1; i++) {
    const currentRoundMatches = matchesByRound[roundIds[i]];
    const nextRoundMatches = matchesByRound[roundIds[i + 1]];

    // Chaque paire de matchs du round actuel mène à un match du round suivant
    for (let j = 0; j < currentRoundMatches.length; j += 2) {
      const match1 = currentRoundMatches[j];
      const match2 = currentRoundMatches[j + 1];
      const nextMatch = nextRoundMatches[Math.floor(j / 2)];

      // Le gagnant du match1 va en position 1 du nextMatch
      await supabase
        .from('playoff_matches')
        .update({
          next_match_id: nextMatch.id,
          next_match_position: 1,
        })
        .eq('id', match1.id);

      // Le gagnant du match2 va en position 2 du nextMatch
      await supabase
        .from('playoff_matches')
        .update({
          next_match_id: nextMatch.id,
          next_match_position: 2,
        })
        .eq('id', match2.id);
    }
  }
}
```

### Étape 2 : Créer une fonction de mise à jour automatique du seeding

**Fichier** : `/src/app/actions/playoff-actions.ts`

```typescript
/**
 * Recalcule le seeding et met à jour le bracket
 * À appeler après chaque mise à jour de résultat de match de poule
 */
export async function updatePlayoffSeeding(tournamentId: string) {
  const supabase = createClient();

  // 1. Récupérer toutes les poules et leurs matchs
  const { data: pools } = await supabase
    .from('pools')
    .select(`
      id,
      name,
      pool_number,
      teams (
        id,
        name,
        players (*)
      )
    `)
    .eq('tournament_id', tournamentId);

  // 2. Pour chaque poule, calculer le classement
  const poolRankings = await Promise.all(
    pools.map(async (pool) => {
      const ranking = await calculatePoolRanking(supabase, pool.id);
      return {
        poolId: pool.id,
        poolNumber: pool.pool_number,
        ranking,
      };
    })
  );

  // 3. Récupérer la configuration (combien de qualifiés par poule ?)
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('config')
    .eq('id', tournamentId)
    .single();

  const qualifiedPerPool = tournament.config.playoffs.qualified_per_pool || 2;

  // 4. Extraire les équipes qualifiées
  const qualifiedTeams = [];

  for (const poolRanking of poolRankings) {
    const topTeams = poolRanking.ranking.slice(0, qualifiedPerPool);

    for (let i = 0; i < topTeams.length; i++) {
      qualifiedTeams.push({
        teamId: topTeams[i].teamId,
        teamName: topTeams[i].teamName,
        poolNumber: poolRanking.poolNumber,
        poolRank: i + 1, // 1er, 2ème, etc.
        points: topTeams[i].points,
        goalAverage: topTeams[i].goalAverage,
        wins: topTeams[i].wins,
        gamesWon: topTeams[i].gamesWon,
      });
    }
  }

  // 5. Calculer le seeding global
  const rankedTeams = calculateGlobalSeeding(qualifiedTeams);

  // 6. Mettre à jour les matchs du bracket
  await updateBracketWithQualifiedTeams(supabase, tournamentId, rankedTeams);

  revalidatePath(`/tournaments/${tournamentId}/admin`);
  revalidatePath(`/tournoi/en-cours`);

  return { success: true, qualifiedCount: rankedTeams.length };
}

/**
 * Calcule le classement d'une poule
 */
async function calculatePoolRanking(supabase: any, poolId: string) {
  // Récupérer tous les matchs de la poule
  const { data: matches } = await supabase
    .from('pool_matches')
    .select(`
      id,
      team1_id,
      team2_id,
      winner_id,
      sets (
        team1_score,
        team2_score
      )
    `)
    .eq('pool_id', poolId)
    .not('winner_id', 'is', null); // Seulement les matchs terminés

  // Récupérer toutes les équipes de la poule
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('pool_id', poolId);

  // Calculer les stats pour chaque équipe
  const teamStats = teams.map((team) => {
    let points = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let gamesWon = 0;
    let gamesLost = 0;

    matches.forEach((match) => {
      const isTeam1 = match.team1_id === team.id;
      const isTeam2 = match.team2_id === team.id;

      if (!isTeam1 && !isTeam2) return;

      const isWinner = match.winner_id === team.id;
      const isDraw = match.winner_id === null;

      if (isWinner) {
        wins++;
        points += 3;
      } else if (isDraw) {
        draws++;
        points += 1;
      } else {
        losses++;
      }

      // Calculer les jeux gagnés/perdus
      match.sets.forEach((set) => {
        if (isTeam1) {
          gamesWon += set.team1_score;
          gamesLost += set.team2_score;
        } else {
          gamesWon += set.team2_score;
          gamesLost += set.team1_score;
        }
      });
    });

    return {
      teamId: team.id,
      teamName: team.name,
      points,
      wins,
      draws,
      losses,
      gamesWon,
      gamesLost,
      goalAverage: gamesWon - gamesLost,
    };
  });

  // Trier selon les critères
  return teamStats.sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.goalAverage !== b.goalAverage) return b.goalAverage - a.goalAverage;
    if (a.wins !== b.wins) return b.wins - a.wins;
    return b.gamesWon - a.gamesWon;
  });
}

/**
 * Calcule le seeding global à partir des équipes qualifiées
 */
function calculateGlobalSeeding(qualifiedTeams: any[]) {
  // Grouper par rang dans la poule
  const byPoolRank = qualifiedTeams.reduce((acc, team) => {
    if (!acc[team.poolRank]) acc[team.poolRank] = [];
    acc[team.poolRank].push(team);
    return acc;
  }, {});

  // Trier chaque groupe par goal average
  Object.keys(byPoolRank).forEach((rank) => {
    byPoolRank[rank].sort((a, b) => {
      if (a.goalAverage !== b.goalAverage) return b.goalAverage - a.goalAverage;
      if (a.wins !== b.wins) return b.wins - a.wins;
      return b.gamesWon - a.gamesWon;
    });
  });

  // Assigner les seeds
  const rankedTeams = [];
  let seed = 1;

  // D'abord tous les 1ers, puis tous les 2èmes, etc.
  Object.keys(byPoolRank)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach((rank) => {
      byPoolRank[rank].forEach((team) => {
        rankedTeams.push({
          ...team,
          seed,
        });
        seed++;
      });
    });

  return rankedTeams;
}

/**
 * Met à jour les slots du bracket avec les équipes qualifiées
 */
async function updateBracketWithQualifiedTeams(
  supabase: any,
  tournamentId: string,
  rankedTeams: any[]
) {
  // Récupérer tous les matchs du premier round
  const { data: firstRoundMatches } = await supabase
    .from('playoff_matches')
    .select('id, match_number, team1_seed, team2_seed')
    .eq('tournament_id', tournamentId)
    .order('match_number');

  // Filtrer uniquement le premier round (ceux avec des seeds prédéfinis)
  const firstRound = firstRoundMatches.filter((m) => m.team1_seed !== null);

  // Pour chaque match du premier round
  for (const match of firstRound) {
    const team1 = rankedTeams.find((t) => t.seed === match.team1_seed);
    const team2 = rankedTeams.find((t) => t.seed === match.team2_seed);

    // Mettre à jour le match avec les IDs d'équipes
    await supabase
      .from('playoff_matches')
      .update({
        team1_id: team1?.teamId || null,
        team2_id: team2?.teamId || null,
      })
      .eq('id', match.id);
  }

  // Appliquer la contrainte de séparation des poules
  await applyPoolSeparationConstraint(supabase, tournamentId, rankedTeams);
}

/**
 * Applique la contrainte : pas d'équipes de la même poule au premier tour
 */
async function applyPoolSeparationConstraint(
  supabase: any,
  tournamentId: string,
  rankedTeams: any[]
) {
  // Récupérer tous les matchs du premier round avec les infos d'équipes
  const { data: matches } = await supabase
    .from('playoff_matches')
    .select(`
      id,
      team1_id,
      team2_id,
      team1_seed,
      team2_seed,
      team1:teams!team1_id (id, pool_id),
      team2:teams!team2_id (id, pool_id)
    `)
    .eq('tournament_id', tournamentId)
    .not('team1_seed', 'is', null);

  // Identifier les matchs où les deux équipes sont de la même poule
  const conflictMatches = matches.filter(
    (m) => m.team1?.pool_id && m.team2?.pool_id && m.team1.pool_id === m.team2.pool_id
  );

  // Pour chaque conflit, essayer de faire un swap
  for (const conflictMatch of conflictMatches) {
    // Chercher un match où on peut échanger team2
    const swapTarget = matches.find((m) => {
      if (m.id === conflictMatch.id) return false;
      if (!m.team1 || !m.team2) return false;

      // Vérifier que le swap résout le problème
      return (
        m.team1.pool_id !== conflictMatch.team2.pool_id &&
        conflictMatch.team1.pool_id !== m.team2.pool_id
      );
    });

    if (swapTarget) {
      // Échanger les team2
      const temp = conflictMatch.team2_id;

      await supabase
        .from('playoff_matches')
        .update({ team2_id: swapTarget.team2_id, team2_seed: swapTarget.team2_seed })
        .eq('id', conflictMatch.id);

      await supabase
        .from('playoff_matches')
        .update({ team2_id: temp, team2_seed: conflictMatch.team2_seed })
        .eq('id', swapTarget.id);
    }
  }
}
```

### Étape 3 : Déclencher la mise à jour après chaque résultat de poule

**Fichier** : `/src/app/actions/pool-match-actions.ts`

```typescript
// Dans la fonction qui met à jour le score d'un match de poule
export async function updatePoolMatchScore(
  matchId: string,
  sets: { team1_score: number; team2_score: number }[]
) {
  // ... code existant pour mettre à jour le match de poule ...

  // NOUVEAU : Après avoir mis à jour le match, recalculer le seeding des playoffs
  const { data: match } = await supabase
    .from('pool_matches')
    .select('pool:pools(tournament_id)')
    .eq('id', matchId)
    .single();

  if (match?.pool?.tournament_id) {
    // Déclencher la mise à jour du bracket en arrière-plan
    await updatePlayoffSeeding(match.pool.tournament_id);
  }

  return { success: true };
}
```

### Étape 4 : Afficher le bracket vide avec indicateurs de progression

**Composant** : `/src/components/tournaments/PlayoffBracket.tsx`

Ajouter un indicateur de remplissage :

```tsx
export function PlayoffBracket({ bracketData, onMatchClick }: PlayoffBracketProps) {
  // Calculer le pourcentage de remplissage
  const totalSlots = Object.values(bracketData.rounds)
    .flat()
    .reduce((acc, match) => acc + 2, 0); // 2 slots par match

  const filledSlots = Object.values(bracketData.rounds)
    .flat()
    .reduce((acc, match) => {
      let filled = 0;
      if (match.team1_id) filled++;
      if (match.team2_id) filled++;
      return acc + filled;
    }, 0);

  const fillPercentage = Math.round((filledSlots / totalSlots) * 100);

  return (
    <div className="space-y-4">
      {/* Indicateur de progression */}
      {fillPercentage < 100 && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">
              Remplissage du tableau
            </span>
            <span className="text-sm font-semibold text-orange-500">
              {fillPercentage}%
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500"
              style={{ width: `${fillPercentage}%` }}
            />
          </div>
          <p className="text-xs text-white/50 mt-2">
            Les équipes se qualifient au fur et à mesure des résultats de poules
          </p>
        </div>
      )}

      {/* Bracket */}
      <div className="overflow-x-auto py-5">
        {/* ... reste du bracket ... */}
      </div>
    </div>
  );
}
```

Modifier l'affichage des équipes dans `MatchCard` :

```tsx
function MatchCard({ match, onClick, isFinal = false }: MatchCardProps) {
  const isTeam1Empty = !match.team1_id;
  const isTeam2Empty = !match.team2_id;

  return (
    <div onClick={onClick} className={/* ... */}>
      {/* Team 1 */}
      <div className={cn(
        'flex items-center justify-between p-1.5 rounded transition-colors',
        isTeam1Winner && 'bg-green-500/10',
        isTeam1Empty && 'opacity-50'
      )}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={cn(
            'text-xs font-semibold min-w-[20px] text-center',
            isTeam1Empty ? 'text-white/30' : 'text-white/50',
            match.team1_seed && match.team1_seed <= 4 && !isTeam1Empty &&
              'bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent font-bold'
          )}>
            {match.team1_seed || '-'}
          </span>
          <span className={cn(
            'text-sm font-medium truncate',
            isTeam1Empty ? 'text-white/40 italic' : 'text-gray-300',
            isTeam1Winner && 'font-semibold text-white'
          )}>
            {match.team1?.name || 'En attente'}
          </span>
        </div>
      </div>

      {/* Séparateur */}
      <div className="h-px bg-white/5 my-1" />

      {/* Team 2 */}
      <div className={cn(
        'flex items-center justify-between p-1.5 rounded transition-colors',
        isTeam2Winner && 'bg-green-500/10',
        isTeam2Empty && 'opacity-50'
      )}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={cn(
            'text-xs font-semibold min-w-[20px] text-center',
            isTeam2Empty ? 'text-white/30' : 'text-white/50',
            match.team2_seed && match.team2_seed <= 4 && !isTeam2Empty &&
              'bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent font-bold'
          )}>
            {match.team2_seed || '-'}
          </span>
          <span className={cn(
            'text-sm font-medium truncate',
            isTeam2Empty ? 'text-white/40 italic' : 'text-gray-300',
            isTeam2Winner && 'font-semibold text-white'
          )}>
            {match.team2?.name || 'En attente'}
          </span>
        </div>
      </div>
    </div>
  );
}
```

---

## 🔄 Flux de données complet

```
1. CRÉATION DU TOURNOI
   ↓
   generateEmptyPlayoffBracket()
   ↓
   Bracket vide créé avec tous les matchs (team_id = null)

2. PHASE DE POULES EN COURS
   ↓
   À chaque résultat de match de poule :
   updatePoolMatchScore() → updatePlayoffSeeding()
   ↓
   - Recalcul du classement de toutes les poules
   - Identification des équipes qualifiées
   - Calcul du seeding global
   - Mise à jour des slots du bracket (team1_id, team2_id)
   - Application de la contrainte de poules différentes

3. AFFICHAGE EN TEMPS RÉEL
   ↓
   Le bracket se remplit progressivement
   - Slots vides : "En attente" (opacité réduite)
   - Slots remplis : Nom de l'équipe + seed en couleur
   - Barre de progression : X% de remplissage

4. FIN DE LA PHASE DE POULES
   ↓
   Bracket complètement rempli (100%)
   Toutes les équipes qualifiées sont placées
   Prêt pour les phases finales
```

---

## ✅ Checklist d'implémentation

- [ ] Fonction `generateEmptyPlayoffBracket()` créée et testée
- [ ] Fonction `updatePlayoffSeeding()` créée et testée
- [ ] Fonction `calculatePoolRanking()` implémentée
- [ ] Fonction `calculateGlobalSeeding()` implémentée
- [ ] Fonction `updateBracketWithQualifiedTeams()` implémentée
- [ ] Fonction `applyPoolSeparationConstraint()` implémentée
- [ ] Hook après mise à jour de match de poule ajouté
- [ ] Affichage des slots vides avec "En attente"
- [ ] Barre de progression du remplissage affichée
- [ ] Styles pour les slots vides (opacity, italic)
- [ ] Revalidation automatique des pages après mise à jour
- [ ] Tests avec différentes configurations (4, 8, 16, 32 équipes)
- [ ] Vérification que le seeding se met à jour en temps réel
- [ ] Vérification de la contrainte de séparation des poules
- [ ] Performance : optimisation des requêtes SQL

---

## 🎨 Design des états du bracket

### État 1 : Bracket vide (0%)
```
Tous les slots affichent "En attente" en italique avec opacité réduite
Barre de progression : 0%
Message : "Les équipes se qualifient au fur et à mesure des résultats de poules"
```

### État 2 : Remplissage partiel (ex: 50%)
```
Certains slots remplis avec noms d'équipes
Certains slots encore vides "En attente"
Barre de progression : 50%
Les seeds top 4 des équipes qualifiées sont en orange
```

### État 3 : Remplissage complet (100%)
```
Tous les slots remplis
Barre de progression : 100% (peut être masquée)
Message : "Tableau complet - Phases finales prêtes à démarrer"
Bouton "Lancer les phases finales" activé
```

---

## 📌 Notes importantes

1. **Performance** : La fonction `updatePlayoffSeeding()` peut être coûteuse. Envisager :
   - Un debounce si plusieurs matchs sont mis à jour rapidement
   - Un système de cache pour les classements de poules
   - Un background job pour les gros tournois

2. **Transactions** : Utiliser des transactions SQL pour garantir la cohérence lors des mises à jour du bracket

3. **Notifications** : Potentiellement envoyer des notifications quand une équipe se qualifie

4. **Mode manuel** : Prévoir un bouton "Recalculer le seeding" en cas de problème

5. **Logs** : Logger toutes les modifications du bracket pour traçabilité

---

**Fin du prompt optimisé pour Roo/ChatGPT 5.2 Codex**
