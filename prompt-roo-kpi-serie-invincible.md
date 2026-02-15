# Prompt Roo : Ajouter le KPI "Série Invincible"

## Contexte du projet

**Stack technique :**
- Next.js 14+ avec App Router
- TypeScript strict
- PostgreSQL via Neon avec bibliothèque `postgres`
- Tailwind CSS
- Design : Proposition 3 - Hybride (Orange #ff6b35→#ff8c42, Violet #9D7AFA, Dark #1E1E2E, Vert #10b981→#34d399)

**Fichier de référence du design :**
Le fichier `home-v2-avec-serie-invincible.html` contient le design HTML/CSS complet du nouveau KPI à ajouter.

## Objectif

Ajouter un nouveau KPI à la page d'accueil : **"Série Invincible"** qui affiche la plus longue série sans défaite d'une paire de joueurs.

**Définition d'une série sans défaite :**
- Une série de matchs consécutifs où la paire n'a PAS perdu
- Cela inclut : les victoires + les matchs nuls/annulés (si applicable)
- La série se termine à la première défaite (quand winner_team_id est défini et n'est pas l'équipe)
- Note : En padel, il n'y a normalement pas de match nul, donc une série sans défaite = série de victoires

### Informations à afficher :
1. **Nombre de matchs sans défaite** (grand chiffre central)
2. **La paire de joueurs** concernée (photos + noms)
3. **Statistiques de la série** : matchs sans défaite, défaites (0), taux sans défaite (100%)
4. **Période** : date de début, date du dernier match, durée en jours
5. **Note historique** : record absolu du club (optionnel)

## Architecture des fichiers

Ajouter/modifier les fichiers suivants :

```
src/
├── components/
│   └── home/
│       └── WinningStreak.tsx         # NOUVEAU composant
├── lib/
│   └── queries/
│       └── home-stats.ts             # MODIFIER - ajouter la fonction
└── types/
    └── home-stats.ts                 # MODIFIER - ajouter le type
```

## Types TypeScript

Ajouter dans `src/types/home-stats.ts` :

```typescript
export type WinningStreak = {
  team_id: string;
  streak_length: number;
  player1_name: string;
  player1_photo: string | null;
  player2_name: string;
  player2_photo: string | null;
  total_victories: number;
  total_tournaments: number;
  streak_start_date: string;
  streak_end_date: string;
  is_active: boolean; // True si la série est toujours en cours (pas de défaite récente)
};
```

## Requête SQL

Ajouter dans `src/lib/queries/home-stats.ts` :

```typescript
/**
 * Récupère la plus longue série sans défaite d'une paire
 * Une série sans défaite = matchs où l'équipe n'a PAS perdu (victoires + matchs nuls/annulés)
 * Une série est considérée comme "active" si aucune défaite n'a été enregistrée depuis
 */
export async function getLongestUndefeatedStreak() {
  const [streak] = await sql<WinningStreak[]>`
    WITH tous_matches AS (
      -- Récupérer tous les matchs de poules avec leur date
      SELECT
        m.id as match_id,
        p.tournament_id,
        t.date as match_date,
        m.team_a_id,
        m.team_b_id,
        m.winner_team_id,
        'pool' as match_type
      FROM matches m
      JOIN pools p ON m.pool_id = p.id
      JOIN tournaments t ON p.tournament_id = t.id
      WHERE m.winner_team_id IS NOT NULL
        AND t.status = 'published'

      UNION ALL

      -- Récupérer tous les matchs de playoffs avec leur date
      SELECT
        pm.id as match_id,
        pr.tournament_id,
        t.date as match_date,
        pm.team_a_id,
        pm.team_b_id,
        pm.winner_team_id,
        'playoff' as match_type
      FROM playoff_matches pm
      JOIN playoff_rounds pr ON pm.playoff_round_id = pr.id
      JOIN tournaments t ON pr.tournament_id = t.id
      WHERE pm.winner_team_id IS NOT NULL
        AND t.status = 'published'
    ),
    matchs_par_equipe AS (
      -- Pour chaque équipe, lister tous ses matchs avec le résultat
      -- Une série "sans défaite" = pas de défaite (victoire OU match nul/annulé)
      SELECT
        team_id,
        match_date,
        match_id,
        -- Match "sans défaite" = victoire OU pas de vainqueur défini
        -- Match "avec défaite" = l'adversaire a gagné
        CASE
          WHEN winner_team_id = team_id THEN true           -- Victoire
          WHEN winner_team_id IS NULL THEN true             -- Match nul/annulé (pas de défaite)
          ELSE false                                        -- Défaite
        END as is_undefeated,
        ROW_NUMBER() OVER (
          PARTITION BY team_id
          ORDER BY match_date, match_id
        ) as match_number
      FROM (
        -- Team A
        SELECT
          tm.team_a_id as team_id,
          tm.match_date,
          tm.match_id,
          tm.winner_team_id
        FROM tous_matches tm
        WHERE tm.team_a_id IS NOT NULL

        UNION ALL

        -- Team B
        SELECT
          tm.team_b_id as team_id,
          tm.match_date,
          tm.match_id,
          tm.winner_team_id
        FROM tous_matches tm
        WHERE tm.team_b_id IS NOT NULL
      ) all_team_matches
    ),
    series_grouping AS (
      -- Créer des groupes de séries en détectant les ruptures (défaites)
      SELECT
        team_id,
        match_date,
        is_undefeated,
        match_number,
        -- Calculer le nombre cumulé de défaites pour créer des groupes
        -- Chaque défaite incrémente le groupe, créant une nouvelle série
        SUM(CASE WHEN is_undefeated THEN 0 ELSE 1 END) OVER (
          PARTITION BY team_id
          ORDER BY match_date, match_number
        ) as streak_group
      FROM matchs_par_equipe
    ),
    series_aggregated AS (
      -- Agréger chaque série sans défaite
      SELECT
        team_id,
        streak_group,
        COUNT(*) FILTER (WHERE is_undefeated) as streak_length,
        MIN(match_date) as streak_start_date,
        MAX(match_date) as streak_end_date,
        -- La série est active si c'est le dernier groupe et que tous les matchs sont sans défaite
        BOOL_AND(is_undefeated) AND streak_group = (
          SELECT MAX(sg2.streak_group)
          FROM series_grouping sg2
          WHERE sg2.team_id = series_grouping.team_id
        ) as is_active
      FROM series_grouping
      WHERE is_undefeated = true
      GROUP BY team_id, streak_group
      HAVING COUNT(*) FILTER (WHERE is_undefeated) >= 3  -- Minimum 3 matchs sans défaite
    ),
    meilleure_serie AS (
      -- Trouver la meilleure série (la plus longue)
      SELECT
        sa.*,
        ROW_NUMBER() OVER (ORDER BY sa.streak_length DESC, sa.streak_end_date DESC) as rank
      FROM series_aggregated sa
    )
    SELECT
      ms.team_id,
      ms.streak_length,
      p1.name as player1_name,
      p1.photo_url as player1_photo,
      p2.name as player2_name,
      p2.photo_url as player2_photo,
      (
        SELECT COUNT(*)
        FROM tous_matches tm2
        WHERE (tm2.team_a_id = ms.team_id OR tm2.team_b_id = ms.team_id)
          AND tm2.winner_team_id = ms.team_id
      )::integer as total_victories,
      (
        SELECT COUNT(DISTINCT tournament_id)
        FROM teams t
        WHERE t.id = ms.team_id
      )::integer as total_tournaments,
      ms.streak_start_date,
      ms.streak_end_date,
      ms.is_active
    FROM meilleure_serie ms
    JOIN teams team ON ms.team_id = team.id
    JOIN team_players tp1 ON tp1.team_id = team.id
    JOIN players p1 ON tp1.player_id = p1.id
    JOIN team_players tp2 ON tp2.team_id = team.id AND tp2.player_id != p1.id
    JOIN players p2 ON tp2.player_id = p2.id
    WHERE ms.rank = 1
    LIMIT 1
  `;

  return streak || null;
}
```

**Note importante sur la logique SQL :**

1. **`tous_matches`** : Union de tous les matchs (poules + playoffs) avec leur date
2. **`matchs_par_equipe`** : Pour chaque équipe, liste chronologique de tous ses matchs avec statut "sans défaite" (victoire OU match nul)
3. **`series_grouping`** : Création de groupes de séries en comptant cumulativement les défaites (chaque défaite crée un nouveau groupe)
4. **`series_aggregated`** : Agrégation de chaque série sans défaite avec sa longueur, dates de début/fin, et statut actif
5. **`meilleure_serie`** : Sélection de la plus longue série
6. **SELECT final** : Jointure avec les joueurs pour récupérer leurs informations

**Logique "sans défaite" :**
- `is_undefeated = true` si : victoire (winner_team_id = team_id) OU match nul (winner_team_id IS NULL)
- `is_undefeated = false` si : défaite (winner_team_id est défini et != team_id)
- En pratique dans le padel, il n'y a pas de match nul, donc "sans défaite" = "victoires"

## Composant React

Créer `src/components/home/WinningStreak.tsx` :

```tsx
import { getLongestUndefeatedStreak } from '@/lib/queries/home-stats';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Flame } from 'lucide-react';
import Image from 'next/image';

export default async function UndefeatedStreak() {
  const streak = await getLongestUndefeatedStreak();

  if (!streak || streak.streak_length < 3) {
    return null; // Ne pas afficher si pas de série significative
  }

  const streakDuration = differenceInDays(
    new Date(streak.streak_end_date),
    new Date(streak.streak_start_date)
  );

  return (
    <div className="bg-gradient-to-br from-[#1E1E2E] via-[#1e2e2a] to-[#1E1E2E] rounded-3xl p-8 border-2 border-green-500/30 shadow-2xl relative overflow-hidden hover:-translate-y-2 hover:shadow-[0_25px_50px_rgba(16,185,129,0.25)] transition-all duration-400 animate-pulse-glow">

      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-green-500/20 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-full blur-3xl" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.6)]">
              <Flame className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white">Série Invincible 🔥</h2>
              <p className="text-sm text-gray-400">Plus longue série sans défaite</p>
            </div>
          </div>
          {streak.is_active && (
            <div className="text-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-xl border border-green-500/40">
                <span className="text-green-400 font-black text-sm">EN FEU</span>
                <span className="text-2xl">🔥</span>
              </div>
            </div>
          )}
        </div>

        {/* Contenu principal */}
        <div className="bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-transparent rounded-2xl p-8 border border-green-500/20">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">

            {/* Compteur de série */}
            <div className="text-center flex-shrink-0">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl"></div>
                <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full w-32 h-32 flex items-center justify-center border-4 border-green-400/50 shadow-2xl">
                  <div className="text-center">
                    <div className="text-5xl font-black leading-none tracking-tighter">
                      {streak.streak_length}
                    </div>
                    <div className="text-xs uppercase font-bold tracking-wider mt-1">matchs</div>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-1">
                  {streak.is_active ? 'Série active' : 'Record'}
                </div>
                <div className="flex justify-center gap-1">
                  <span className="text-2xl">🔥</span>
                  <span className="text-2xl">🔥</span>
                  <span className="text-2xl">🔥</span>
                </div>
              </div>
            </div>

            {/* Séparateur vertical */}
            <div className="hidden lg:block w-px h-32 bg-gradient-to-b from-transparent via-green-500/50 to-transparent"></div>

            {/* Informations de la paire */}
            <div className="flex-1 w-full">
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/20 rounded-lg border border-yellow-500/30 mb-3">
                  <span className="text-xl">👑</span>
                  <span className="text-yellow-400 text-sm font-bold">Paire dominante</span>
                </div>
              </div>

              {/* Paire de joueurs */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex -space-x-4">
                  <PlayerAvatar name={streak.player1_name} photo={streak.player1_photo} size="xl" />
                  <PlayerAvatar name={streak.player2_name} photo={streak.player2_photo} size="xl" />
                </div>
                <div>
                  <p className="text-2xl font-black text-white">{streak.player1_name}</p>
                  <p className="text-2xl font-black text-white">{streak.player2_name}</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {streak.total_tournaments} tournois • {streak.total_victories} victoires totales
                  </p>
                </div>
              </div>

              {/* Statistiques de la série */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">{streak.streak_length}</div>
                  <div className="text-xs text-gray-400">Matchs gagnés</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">0</div>
                  <div className="text-xs text-gray-400">Défaites</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">100%</div>
                  <div className="text-xs text-gray-400">Taux victoire</div>
                </div>
              </div>
            </div>

          </div>

          {/* Période de la série */}
          <div className="mt-6 pt-6 border-t border-green-500/20">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 text-sm">
              <div>
                <span className="text-gray-400">Début de série :</span>
                <span className="text-white font-semibold ml-2">
                  {format(new Date(streak.streak_start_date), 'dd MMMM yyyy', { locale: fr })}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Dernier match :</span>
                <span className={`font-semibold ml-2 ${streak.is_active ? 'text-green-400' : 'text-white'}`}>
                  {format(new Date(streak.streak_end_date), 'dd MMMM yyyy', { locale: fr })}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Durée :</span>
                <span className="text-white font-semibold ml-2">{streakDuration} jours</span>
              </div>
            </div>
          </div>
        </div>

        {/* Note optionnelle pour le contexte */}
        {!streak.is_active && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>Cette série s'est terminée sur une défaite</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerAvatar({ name, photo, size = 'md' }: { name: string; photo: string | null; size?: 'md' | 'lg' | 'xl' }) {
  const sizeClasses = {
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-20 h-20 text-2xl',
  };

  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);
  const colors = [
    'from-[#ff6b35] to-[#ff8c42]',
    'from-[#9D7AFA] to-[#B39DFF]',
    'from-blue-500 to-blue-600',
    'from-green-500 to-green-600',
    'from-purple-500 to-purple-600'
  ];
  const colorIndex = name.charCodeAt(0) % colors.length;

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center text-white font-bold border-4 border-[#1E1E2E] shadow-xl`}>
      {photo ? (
        <Image
          src={photo}
          alt={name}
          width={size === 'xl' ? 80 : size === 'lg' ? 64 : 48}
          height={size === 'xl' ? 80 : size === 'lg' ? 64 : 48}
          className="rounded-full"
        />
      ) : (
        initials
      )}
    </div>
  );
}
```

## Intégration dans la page d'accueil

Modifier `src/app/page.tsx` pour ajouter le nouveau composant :

```tsx
import WinningStreak from '@/components/home/WinningStreak';
// ... autres imports

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a14] via-[#1E1E2E] to-[#0f0f1a]">

      <HomeHero />

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Colonne gauche (3/5) */}
          <div className="lg:col-span-3 space-y-6">

            {/* NOUVEAU : Série Invincible en premier */}
            <WinningStreak />

            {/* Reste des composants */}
            <RecentWinners />
            <ClosestMatch />
          </div>

          {/* Colonne droite (2/5) - inchangée */}
          <div className="lg:col-span-2 space-y-6">
            <TopTeams />
            <TopPlayers />
            <NextTournament />
          </div>

        </div>
      </div>

    </div>
  );
}
```

## Tailwind Config

Ajouter l'animation pulse-glow dans `tailwind.config.js` :

```js
module.exports = {
  theme: {
    extend: {
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(16, 185, 129, 0.8)' },
        },
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
    },
  },
}
```

## Points d'attention

### 1. **Performance de la requête SQL**

La requête est complexe avec plusieurs CTEs. Pour optimiser :
- Créer un index sur `tournaments.date`
- Créer un index composite sur `(team_id, match_date)` dans une vue matérialisée si nécessaire
- La requête utilise `HAVING COUNT(*) >= 3` pour filtrer les séries trop courtes

### 2. **Cas limites**

- **Pas de série** : Le composant retourne `null` si `streak_length < 3`
- **Égalité** : En cas d'égalité de longueur, la série la plus récente est choisie (`ORDER BY streak_end_date DESC`)
- **Série active vs terminée** : Le flag `is_active` permet de différencier

### 3. **Logique métier**

**Définition d'une série :**
- Une série commence après une défaite (ou au début de la carrière de la paire)
- Elle se poursuit tant que la paire gagne
- Elle se termine à la première défaite

**Série active :**
- `is_active = true` si c'est le dernier groupe de la paire ET qu'il ne contient que des victoires
- Visuellement : badge "EN FEU" vert si active

### 4. **Design**

- **Couleur principale** : Vert (#10b981 → #34d399) pour se différencier des autres KPI
- **Icône** : Flamme (Flame de lucide-react) + emoji 🔥
- **Animation** : `pulse-glow` pour l'effet de pulsation de la bordure verte
- **Médailles** : 👑 pour "Paire dominante"

### 5. **Responsive**

- Desktop : Layout horizontal avec compteur à gauche, infos à droite
- Mobile : Layout vertical empilé
- Utiliser `flex-col lg:flex-row` pour s'adapter

## Checklist de validation

- [ ] La requête SQL retourne la bonne série (la plus longue)
- [ ] Le flag `is_active` est correct (true seulement si série en cours)
- [ ] Le compteur affiche le bon nombre de victoires
- [ ] Les photos des joueurs s'affichent (ou initiales si absentes)
- [ ] Les dates sont formatées en français
- [ ] La durée en jours est correcte
- [ ] Le badge "EN FEU" s'affiche uniquement pour les séries actives
- [ ] L'animation pulse-glow fonctionne
- [ ] Le design est responsive
- [ ] Les effets hover fonctionnent
- [ ] Le composant ne s'affiche pas s'il n'y a pas de série >= 3 victoires

## Test de la requête SQL

Pour tester la requête manuellement :

```sql
-- Vérifier les séries de victoires pour une équipe spécifique
WITH tous_matches AS (
  -- ... (copier la requête complète)
)
SELECT * FROM tous_matches
WHERE team_a_id = 'uuid-de-test' OR team_b_id = 'uuid-de-test'
ORDER BY match_date;
```

## Améliorations futures (optionnel)

1. **Record historique** : Ajouter une deuxième requête pour récupérer le record absolu du club
2. **Animation** : Ajouter une animation de compteur qui s'incrémente au chargement
3. **Graphique** : Timeline visuelle des victoires de la série
4. **Comparaison** : Afficher le top 3 des plus longues séries

## Commandes de test

```bash
# Développement
npm run dev

# Vérifier les types
npm run type-check

# Test de la requête SQL directement
psql $DATABASE_URL -c "SELECT * FROM ..."
```

Visiter `http://localhost:3000/` pour voir le nouveau KPI en action !
