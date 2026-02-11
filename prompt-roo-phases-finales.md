# Prompt Roo/ChatGPT 5.2 Codex - Implémentation Phases Finales

## 📋 Contexte du projet

**Projet** : Le tournoi des frérots - Plateforme de gestion de tournois de padel
**Stack technique** :
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- PostgreSQL (via Supabase)
- Server Actions pour les mutations

**Charte graphique** :
- Orange : `#ff6b35` → `#ff8c42` (gradient)
- Vert : `#4CAF50`
- Violet : `#9D7AFA`
- Jaune : `#FFDA77`
- Background : `#1E1E2E`
- Style : Urbain-sport, moderne avec cards et dégradés

---

## 🎯 Objectifs de cette tâche

### 1. Ajouter un onglet "Phases finales" dans `/tournaments/[slug]/admin`

**Localisation** : `/src/app/tournaments/[slug]/admin/page.tsx`

**Modifications à effectuer** :
- Ajouter un nouvel onglet "Phases finales" dans le système de tabs existant
- Badge affichant le nombre de matchs de phases finales
- Icône : 🏆 ou équivalent lucide-react

**Référence de design des tabs** :
```typescript
const tabs = [
  { id: 'pending', label: 'À valider', count: pendingCount, icon: Clock },
  { id: 'approved', label: 'Validés', count: approvedCount, icon: CheckCircle },
  { id: 'teams', label: 'Équipes', count: teamsCount, icon: Users },
  { id: 'pools', label: 'Poules', count: poolsCount, icon: Grid },
  { id: 'matches', label: 'Matchs & Classement', count: matchesCount, icon: Trophy },
  { id: 'playoffs', label: 'Phases finales', count: playoffMatchesCount, icon: Award }, // NOUVEAU
];
```

### 2. Implémenter l'affichage du bracket style horizontal (March Madness)

**Design de référence** : `bracket-proposition-2-32-equipes.html` (dans le dossier du projet)

**Spécification fonctionnelle** : `specification-phases-finales.md` (dans le dossier du projet)

**Structure du bracket** :
```
Grid Layout : [16èmes gauche] [8èmes gauche] [Quarts gauche] [Demi gauche] [FINALE] [Demi droite] [Quarts droite] [8èmes droite] [16èmes droite]
```

**Composant React à créer** :
```tsx
// /src/components/tournaments/PlayoffBracket.tsx
interface PlayoffBracketProps {
  tournamentId: string;
  playoffMatches: PlayoffMatch[];
  onMatchClick: (matchId: string) => void;
}

export function PlayoffBracket({ tournamentId, playoffMatches, onMatchClick }: PlayoffBracketProps) {
  // Structure en grid avec 9 colonnes
  // Grouper les matchs par round
  // Appliquer les espacements verticaux (margin-bottom) selon le round
  // Gérer le clic sur chaque match card
}
```

**Classes Tailwind importantes** (issues du HTML de référence) :
```css
/* Grid principal */
.bracket {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 0.8fr auto 0.8fr 1fr 1.5fr 2fr;
  gap: 1rem;
  min-width: 1400px;
  align-items: center;
}

/* Espacements verticaux par round */
.round-16 .match { margin-bottom: 0.5rem; }
.round-8 .match { margin-bottom: 42px; }
.round-quarter .match { margin-bottom: 106px; }
.round-semi .match { margin-bottom: 230px; }

/* Match card */
.match {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 0.5rem;
  transition: all 0.3s ease;
  cursor: pointer;
}

.match:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 107, 53, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* Seeds top 4 avec gradient orange */
.seed.top-seed {
  background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 700;
}

/* Statut indicators */
.status-indicator.live {
  background: #ff6b35;
  animation: pulse 2s infinite;
}

.status-indicator.completed {
  background: #4CAF50;
}

/* Gagnant */
.team.winner {
  background: rgba(76, 175, 80, 0.1);
}

.team.winner .score {
  color: #4CAF50;
}
```

### 3. Gérer le clic sur un match pour ouvrir la modal de score

**Modal existante** : Réutiliser la modal de saisie de score de l'onglet "Matchs & Classement"

**Localisation probable** :
- Rechercher dans `/src/components/tournaments/` un composant type `MatchScoreModal.tsx` ou `ScoreEditModal.tsx`
- Si la modal existe déjà pour les matchs de poules, la réutiliser en passant `playoffMatchId` au lieu de `poolMatchId`

**Props attendues** :
```typescript
interface ScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  matchType: 'pool' | 'playoff'; // NOUVEAU : distinguer les types
  onScoreUpdated: () => void;
}
```

**Gestion du clic** :
```typescript
const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

const handleMatchClick = (matchId: string) => {
  setSelectedMatchId(matchId);
};

const handleCloseModal = () => {
  setSelectedMatchId(null);
};

const handleScoreUpdated = async () => {
  // Recharger les données du bracket
  await fetchPlayoffMatches();
  setSelectedMatchId(null);
};
```

### 4. Logique de détermination du gagnant et progression

**Règles métier** :
- Le gagnant est celui qui remporte le plus de sets
- Format : **Meilleur de 3 sets** en phases finales (pour accélérer le tournoi)
- Pas d'égalité possible (format à élimination directe)
- Le gagnant passe automatiquement au tour suivant

**Règles de sets** (identiques aux poules) :
- Premier à 6 jeux avec 2 jeux d'écart minimum
- Si 5-5 → jouer jusqu'à 7-5
- Si 6-6 → jouer jusqu'à 7-6
- Maximum 3 sets en phases finales

**Validation côté serveur** :
```typescript
// /src/app/actions/playoff-actions.ts
'use server';

export async function updatePlayoffMatchScore(
  matchId: string,
  sets: { team1_score: number; team2_score: number }[]
) {
  // 1. Valider que les scores respectent les règles du padel
  for (const set of sets) {
    const { team1_score, team2_score } = set;
    const diff = Math.abs(team1_score - team2_score);

    // Vérifier les règles de set
    if (team1_score < 6 && team2_score < 6) {
      throw new Error('Un set doit aller au moins jusqu\'à 6 jeux');
    }

    if (team1_score === 6 && team2_score === 6) {
      throw new Error('À 6-6, le set doit aller jusqu\'à 7-6');
    }

    if ((team1_score === 7 || team2_score === 7) && diff < 1) {
      throw new Error('À 7 jeux, il faut 1 jeu d\'écart minimum');
    }

    if (diff < 2 && team1_score < 7 && team2_score < 7) {
      throw new Error('Il faut 2 jeux d\'écart minimum (sauf cas 7-5 ou 7-6)');
    }
  }

  // 2. Déterminer le gagnant
  const team1Sets = sets.filter(s => s.team1_score > s.team2_score).length;
  const team2Sets = sets.filter(s => s.team2_score > s.team1_score).length;

  if (team1Sets === team2Sets) {
    throw new Error('Il doit y avoir un gagnant (pas d\'égalité en phases finales)');
  }

  const winnerId = team1Sets > team2Sets ? match.team1_id : match.team2_id;

  // 3. Insérer les sets dans la table playoff_sets
  await supabase.from('playoff_sets').insert(
    sets.map((set, index) => ({
      match_id: matchId,
      set_number: index + 1,
      team1_score: set.team1_score,
      team2_score: set.team2_score,
    }))
  );

  // 4. Mettre à jour le match avec le gagnant
  await supabase
    .from('playoff_matches')
    .update({ winner_id: winnerId })
    .eq('id', matchId);

  // 5. Faire progresser le gagnant au tour suivant
  const match = await supabase
    .from('playoff_matches')
    .select('next_match_id, next_match_position')
    .eq('id', matchId)
    .single();

  if (match.next_match_id) {
    const updateField = match.next_match_position === 1 ? 'team1_id' : 'team2_id';

    await supabase
      .from('playoff_matches')
      .update({ [updateField]: winnerId })
      .eq('id', match.next_match_id);
  }

  revalidatePath(`/tournaments/[slug]/admin`);
  return { success: true };
}
```

### 5. Ajouter les onglets sur `/tournoi/en-cours`

**Localisation** : `/src/app/tournoi/en-cours/page.tsx`

**Structure de la page** :
```tsx
export default async function TournoiEnCoursPage() {
  // 1. Récupérer les tournois actifs ou récents
  const tournaments = await getTournaments();

  // 2. État pour le tournoi sélectionné et l'onglet actif
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'matches' | 'playoffs'>('matches');

  return (
    <div className="container mx-auto p-6">
      {/* Header avec titre et dropdown de sélection */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
          Tournoi
        </h1>

        {/* Dropdown pour sélectionner le tournoi */}
        <TournamentSelector
          tournaments={tournaments}
          selectedId={selectedTournamentId}
          onSelect={setSelectedTournamentId}
        />
      </div>

      {selectedTournamentId && (
        <>
          {/* Tabs : Matchs & classement | Phases finales */}
          <div className="flex gap-2 mb-6 border-b border-white/10">
            <button
              onClick={() => setActiveTab('matches')}
              className={cn(
                'px-6 py-3 rounded-t-lg font-medium transition-all',
                activeTab === 'matches'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white'
                  : 'text-white/60 hover:text-white/80'
              )}
            >
              Matchs & Classement
            </button>
            <button
              onClick={() => setActiveTab('playoffs')}
              className={cn(
                'px-6 py-3 rounded-t-lg font-medium transition-all',
                activeTab === 'playoffs'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white'
                  : 'text-white/60 hover:text-white/80'
              )}
            >
              Phases finales
            </button>
          </div>

          {/* Contenu des tabs */}
          {activeTab === 'matches' && (
            <MatchesAndRankings tournamentId={selectedTournamentId} />
          )}

          {activeTab === 'playoffs' && (
            <PlayoffBracket
              tournamentId={selectedTournamentId}
              playoffMatches={playoffMatches}
              onMatchClick={handleMatchClick}
            />
          )}
        </>
      )}
    </div>
  );
}
```

**Différence avec la page admin** :
- Pas de bouton "Modifier le score" visible par défaut
- Clic sur un match → ouvre la modal en lecture seule OU éditable selon les permissions
- Statuts visuels plus prononcés (live, terminé, à venir)

---

## 📊 Modèle de données

### Tables PostgreSQL nécessaires

**1. Table `playoff_rounds`** :
```sql
CREATE TABLE playoff_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id),
  round_number INT NOT NULL, -- 1 = 16èmes, 2 = 8èmes, 3 = quarts, 4 = demi, 5 = finale
  round_name TEXT NOT NULL, -- "16èmes de finale", "8èmes de finale", "Quarts", "Demi-finales", "Finale"
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**2. Table `playoff_matches`** :
```sql
CREATE TABLE playoff_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id),
  round_id UUID NOT NULL REFERENCES playoff_rounds(id),
  match_number INT NOT NULL, -- Position dans le bracket (1-16 pour 16èmes, etc.)
  team1_id UUID REFERENCES teams(id),
  team2_id UUID REFERENCES teams(id),
  winner_id UUID REFERENCES teams(id),
  team1_seed INT, -- Seed de l'équipe 1 (1-32)
  team2_seed INT, -- Seed de l'équipe 2 (1-32)
  scheduled_at TIMESTAMPTZ,
  next_match_id UUID REFERENCES playoff_matches(id), -- Match suivant si victoire
  next_match_position INT, -- 1 ou 2 (position dans le prochain match : team1 ou team2)
  status TEXT DEFAULT 'upcoming', -- 'upcoming', 'live', 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**3. Table `playoff_sets`** :
```sql
CREATE TABLE playoff_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES playoff_matches(id),
  set_number INT NOT NULL, -- 1, 2, ou 3
  team1_score INT NOT NULL, -- Jeux gagnés par team1
  team2_score INT NOT NULL, -- Jeux gagnés par team2
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Types TypeScript

```typescript
// /src/types/playoff.ts

export type PlayoffRound = {
  id: string;
  tournament_id: string;
  round_number: number;
  round_name: string;
  created_at: string;
};

export type PlayoffMatch = {
  id: string;
  tournament_id: string;
  round_id: string;
  match_number: number;
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
  team1_seed: number | null;
  team2_seed: number | null;
  scheduled_at: string | null;
  next_match_id: string | null;
  next_match_position: number | null;
  status: 'upcoming' | 'live' | 'completed';
  created_at: string;
  // Relations
  team1?: Team;
  team2?: Team;
  winner?: Team;
  sets?: PlayoffSet[];
  round?: PlayoffRound;
};

export type PlayoffSet = {
  id: string;
  match_id: string;
  set_number: number;
  team1_score: number;
  team2_score: number;
  created_at: string;
};

export type PlayoffBracketData = {
  rounds: {
    [roundNumber: number]: PlayoffMatch[];
  };
  champion: Team | null;
};
```

---

## 🔧 Étapes d'implémentation recommandées

### Étape 1 : Créer les tables de base de données
```bash
# Créer une migration Supabase
supabase migration new add_playoff_tables

# Copier les définitions SQL ci-dessus dans le fichier de migration
# Exécuter la migration
supabase db push
```

### Étape 2 : Créer les types TypeScript
```bash
# Créer le fichier de types
touch src/types/playoff.ts
# Copier les définitions TypeScript ci-dessus
```

### Étape 3 : Créer les Server Actions
```bash
# Créer le fichier d'actions
touch src/app/actions/playoff-actions.ts
```

**Fonctions à implémenter** :
- `getPlayoffMatches(tournamentId: string)` : Récupérer tous les matchs avec relations
- `getPlayoffBracketData(tournamentId: string)` : Récupérer les données structurées pour le bracket
- `updatePlayoffMatchScore(matchId: string, sets: PlayoffSet[])` : Mettre à jour le score d'un match

### Étape 4 : Créer le composant PlayoffBracket
```bash
touch src/components/tournaments/PlayoffBracket.tsx
```

**Structure du composant** :
```tsx
'use client';

import { useState } from 'react';
import { PlayoffMatch, PlayoffBracketData } from '@/types/playoff';
import { cn } from '@/lib/utils';

interface PlayoffBracketProps {
  bracketData: PlayoffBracketData;
  onMatchClick: (matchId: string) => void;
}

export function PlayoffBracket({ bracketData, onMatchClick }: PlayoffBracketProps) {
  const rounds = bracketData.rounds;

  // Déterminer le nombre total de rounds
  const totalRounds = Object.keys(rounds).length;

  // Grouper les rounds par côté (gauche vs droite)
  const leftRounds = Object.entries(rounds)
    .filter(([roundNum]) => parseInt(roundNum) < totalRounds)
    .sort(([a], [b]) => parseInt(a) - parseInt(b));

  const rightRounds = [...leftRounds].reverse();
  const finalRound = rounds[totalRounds];

  return (
    <div className="overflow-x-auto py-5">
      <div className="grid gap-4 min-w-[1400px]" style={{
        gridTemplateColumns: '2fr 1.5fr 1fr 0.8fr auto 0.8fr 1fr 1.5fr 2fr'
      }}>
        {/* Rounds gauche */}
        {leftRounds.map(([roundNum, matches]) => (
          <RoundColumn
            key={`left-${roundNum}`}
            roundNumber={parseInt(roundNum)}
            matches={matches}
            onMatchClick={onMatchClick}
          />
        ))}

        {/* Finale */}
        <div className="flex flex-col gap-3">
          <div className="text-center text-sm font-semibold text-white/50 uppercase mb-3 p-2 bg-white/5 rounded-lg">
            Finale
          </div>
          {finalRound && finalRound[0] && (
            <MatchCard
              match={finalRound[0]}
              onClick={() => onMatchClick(finalRound[0].id)}
              isFinal
            />
          )}
          {bracketData.champion && (
            <div className="mt-4 p-3 bg-gradient-to-r from-orange-500 to-orange-400 rounded-lg text-center">
              <div className="text-xs uppercase tracking-wide text-white/80 mb-1">
                Champion du Tournoi
              </div>
              <div className="text-lg font-bold text-white">
                {bracketData.champion.name}
              </div>
            </div>
          )}
        </div>

        {/* Rounds droite */}
        {rightRounds.map(([roundNum, matches]) => (
          <RoundColumn
            key={`right-${roundNum}`}
            roundNumber={parseInt(roundNum)}
            matches={matches}
            onMatchClick={onMatchClick}
          />
        ))}
      </div>
    </div>
  );
}

function RoundColumn({ roundNumber, matches, onMatchClick }: {
  roundNumber: number;
  matches: PlayoffMatch[];
  onMatchClick: (matchId: string) => void;
}) {
  const roundNames = {
    1: '16èmes',
    2: '8èmes',
    3: 'Quarts',
    4: 'Demi',
  };

  // Espacements verticaux selon le round
  const spacings = {
    1: 'mb-2',      // 16èmes
    2: 'mb-[42px]', // 8èmes
    3: 'mb-[106px]', // Quarts
    4: 'mb-[230px]', // Demi
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-center text-sm font-semibold text-white/50 uppercase mb-3 p-2 bg-white/5 rounded-lg">
        {roundNames[roundNumber as keyof typeof roundNames]}
      </div>
      <div className="flex flex-col">
        {matches.map((match, index) => (
          <div
            key={match.id}
            className={cn(
              index < matches.length - 1 && spacings[roundNumber as keyof typeof spacings]
            )}
          >
            <MatchCard match={match} onClick={() => onMatchClick(match.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchCard({ match, onClick, isFinal = false }: {
  match: PlayoffMatch;
  onClick: () => void;
  isFinal?: boolean;
}) {
  // Calculer les scores de sets
  const team1SetsWon = match.sets?.filter(s => s.team1_score > s.team2_score).length || 0;
  const team2SetsWon = match.sets?.filter(s => s.team2_score > s.team1_score).length || 0;

  const isTeam1Winner = match.winner_id === match.team1_id;
  const isTeam2Winner = match.winner_id === match.team2_id;

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative bg-white/[0.04] border border-white/10 rounded-lg p-2 transition-all cursor-pointer hover:bg-white/[0.06] hover:border-orange-500/40 hover:-translate-y-0.5 hover:shadow-xl',
        match.status === 'live' && 'border-orange-500/60 bg-orange-500/[0.08]',
        isFinal && 'bg-orange-500/[0.08] border-orange-500/40 p-4'
      )}
    >
      {/* Status indicator */}
      <div className={cn(
        'absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full',
        match.status === 'live' && 'bg-orange-500 animate-pulse',
        match.status === 'completed' && 'bg-green-500',
        match.status === 'upcoming' && 'bg-white/20'
      )} />

      {/* Team 1 */}
      <div className={cn(
        'flex items-center justify-between p-1.5 rounded transition-colors',
        isTeam1Winner && 'bg-green-500/10'
      )}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={cn(
            'text-xs font-semibold text-white/50 min-w-[20px] text-center',
            match.team1_seed && match.team1_seed <= 4 && 'bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent font-bold'
          )}>
            {match.team1_seed || '-'}
          </span>
          <span className={cn(
            'text-sm font-medium text-gray-300 truncate',
            isTeam1Winner && 'font-semibold text-white'
          )}>
            {match.team1?.name || 'En attente'}
          </span>
        </div>
        {match.status !== 'upcoming' && (
          <span className={cn(
            'text-sm font-semibold min-w-[24px] text-right',
            isTeam1Winner ? 'text-green-500' : 'text-white/70'
          )}>
            {team1SetsWon}
          </span>
        )}
      </div>

      {/* Séparateur */}
      <div className="h-px bg-white/5 my-1" />

      {/* Team 2 */}
      <div className={cn(
        'flex items-center justify-between p-1.5 rounded transition-colors',
        isTeam2Winner && 'bg-green-500/10'
      )}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={cn(
            'text-xs font-semibold text-white/50 min-w-[20px] text-center',
            match.team2_seed && match.team2_seed <= 4 && 'bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent font-bold'
          )}>
            {match.team2_seed || '-'}
          </span>
          <span className={cn(
            'text-sm font-medium text-gray-300 truncate',
            isTeam2Winner && 'font-semibold text-white'
          )}>
            {match.team2?.name || 'En attente'}
          </span>
        </div>
        {match.status !== 'upcoming' && (
          <span className={cn(
            'text-sm font-semibold min-w-[24px] text-right',
            isTeam2Winner ? 'text-green-500' : 'text-white/70'
          )}>
            {team2SetsWon}
          </span>
        )}
      </div>
    </div>
  );
}
```

### Étape 5 : Intégrer dans la page admin
```tsx
// /src/app/tournaments/[slug]/admin/page.tsx

// Ajouter le nouvel onglet
const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'teams' | 'pools' | 'matches' | 'playoffs'>('pending');

// Récupérer les données de playoff
const playoffMatches = await getPlayoffMatches(params.slug);
const playoffBracketData = await getPlayoffBracketData(params.slug);

// Ajouter le tab dans l'interface
{activeTab === 'playoffs' && (
  <div>
    <PlayoffBracket
      bracketData={playoffBracketData}
      onMatchClick={handlePlayoffMatchClick}
    />
  </div>
)}
```

### Étape 6 : Intégrer dans `/tournoi/en-cours`
```tsx
// /src/app/tournoi/en-cours/page.tsx

// Structure similaire à la page admin mais avec :
// - Dropdown de sélection de tournoi
// - Tabs horizontaux (Matchs & Classement | Phases finales)
// - Même composant PlayoffBracket réutilisé
```

---

## ✅ Checklist de validation

Avant de considérer la tâche terminée, vérifier que :

- [ ] L'onglet "Phases finales" apparaît dans `/tournaments/[slug]/admin`
- [ ] Le badge affiche le bon nombre de matchs de phases finales
- [ ] Le bracket s'affiche correctement en style horizontal (March Madness)
- [ ] Les seeds 1-4 sont mis en avant avec le gradient orange
- [ ] Les espacements verticaux sont corrects pour chaque round
- [ ] Le clic sur un match ouvre la modal de score
- [ ] La modal permet de saisir 3 sets maximum (meilleur de 3)
- [ ] Les règles de score de sets sont validées (6 jeux min, 2 d'écart, etc.)
- [ ] Le gagnant est correctement déterminé (celui avec le plus de sets gagnés)
- [ ] Le gagnant progresse automatiquement au tour suivant
- [ ] L'affichage se met à jour après modification d'un score
- [ ] La page `/tournoi/en-cours` affiche le sélecteur de tournoi
- [ ] Les tabs "Matchs & Classement" et "Phases finales" fonctionnent
- [ ] Le composant PlayoffBracket fonctionne dans les deux contextes (admin et public)
- [ ] Le design respecte la charte graphique urbain-sport
- [ ] Le bracket est responsive (scroll horizontal sur petits écrans)
- [ ] Les statuts (live, completed, upcoming) sont visuellement distincts
- [ ] Le champion est affiché avec sa bannière orange

---

## 📌 Notes importantes pour Roo/Codex

1. **Réutiliser le code existant** : Ne pas réinventer la roue, s'appuyer sur les patterns déjà présents dans le projet (Server Actions, composants, styles)

2. **TypeScript strict** : Toujours typer correctement les données, éviter les `any`

3. **Server Components par défaut** : Utiliser des Server Components sauf pour les composants interactifs (ceux avec `onClick`, `useState`, etc.) qui doivent être `'use client'`

4. **Validation côté serveur** : Toutes les mutations doivent être validées dans les Server Actions avant d'être envoyées à la base de données

5. **Revalidation** : Utiliser `revalidatePath()` après chaque mutation pour mettre à jour le cache Next.js

6. **Accessibilité** : Penser aux états focus, aux labels ARIA si nécessaire

7. **Performance** : Optimiser les requêtes SQL (utiliser les `select` avec relations plutôt que plusieurs requêtes)

8. **Gestion d'erreurs** : Toujours gérer les cas d'erreur et afficher des messages clairs à l'utilisateur

9. **Mobile-first** : Bien que le bracket soit large, prévoir un scroll horizontal fluide sur mobile

10. **Tests** : Tester avec différentes configurations (8 équipes, 16 équipes, 32 équipes) pour s'assurer que le layout s'adapte

---

**Fin du prompt optimisé pour Roo/ChatGPT 5.2 Codex**
