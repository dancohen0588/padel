# Prompt Roo : Implémenter le design Home V2 avec Hero Image

## Contexte du projet

**Stack technique :**
- Next.js 14+ avec App Router
- TypeScript strict
- PostgreSQL via Neon avec bibliothèque `postgres`
- Tailwind CSS
- Design : Proposition 3 - Hybride (Orange #ff6b35→#ff8c42, Violet #9D7AFA, Dark #1E1E2E)
- date-fns pour le formatage des dates en français
- lucide-react pour les icônes

**Fichier de référence du design :**
Le fichier `home-v2-avec-hero-image.html` contient le design HTML/CSS complet à implémenter. Il faut le convertir en composants React Server Components pour Next.js.

## Objectif

Implémenter la nouvelle page d'accueil avec :
1. **Section Hero** avec image de fond en format paysage et stats superposées
2. **Derniers Vainqueurs** en style podium (🥇🥈🥉)
3. **Match le plus serré** du dernier tournoi
4. **Top Paires** (5 meilleures paires par victoires)
5. **Top Joueurs** (5 meilleurs joueurs par victoires)
6. **Prochain Tournoi** en CTA orange

## Architecture des fichiers

```
src/
├── app/
│   └── page.tsx                          # Page d'accueil principale
├── components/
│   └── home/
│       ├── HomeHero.tsx                  # Section hero avec image + stats
│       ├── RecentWinners.tsx             # Derniers vainqueurs (podium)
│       ├── ClosestMatch.tsx              # Match le plus serré
│       ├── TopTeams.tsx                  # Top paires
│       ├── TopPlayers.tsx                # Top joueurs
│       └── NextTournament.tsx            # Prochain tournoi CTA
├── lib/
│   └── queries/
│       └── home-stats.ts                 # Fonctions de requêtes SQL
└── types/
    └── home-stats.ts                     # Types TypeScript
```

## Types TypeScript à créer

Créer `src/types/home-stats.ts` :

```typescript
export type HomeStats = {
  tournaments_count: number;
  matches_count: number;
  players_count: number;
  sets_count: number;
};

export type RecentWinner = {
  tournament_id: string;
  tournament_name: string;
  tournament_date: string;
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
  set1_score: string;
  set2_score: string;
  set3_score: string | null;
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

export type NextTournament = {
  id: string;
  name: string;
  date: string;
  location: string;
  status: string;
};
```

## Requêtes SQL

Créer `src/lib/queries/home-stats.ts` :

```typescript
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

/**
 * Récupère les statistiques globales pour le hero
 */
export async function getHomeStats() {
  const [stats] = await sql<{
    tournaments_count: string;
    matches_count: string;
    players_count: string;
    sets_count: string;
  }[]>`
    SELECT
      (SELECT COUNT(*)::text FROM tournaments WHERE status = 'published') as tournaments_count,
      (
        SELECT (COUNT(m.id) + COUNT(pm.id))::text
        FROM tournaments t
        LEFT JOIN pools p ON p.tournament_id = t.id
        LEFT JOIN matches m ON m.pool_id = p.id
        LEFT JOIN playoff_rounds pr ON pr.tournament_id = t.id
        LEFT JOIN playoff_matches pm ON pm.playoff_round_id = pr.id
        WHERE t.status = 'published'
      ) as matches_count,
      (
        SELECT COUNT(DISTINCT tp.player_id)::text
        FROM team_players tp
        JOIN teams t ON tp.team_id = t.id
        JOIN tournaments tour ON t.tournament_id = tour.id
        WHERE tour.status = 'published'
      ) as players_count,
      (
        SELECT (COUNT(ms.id) + COUNT(ps.id))::text
        FROM tournaments t
        LEFT JOIN pools p ON p.tournament_id = t.id
        LEFT JOIN matches m ON m.pool_id = p.id
        LEFT JOIN match_sets ms ON ms.match_id = m.id
        LEFT JOIN playoff_rounds pr ON pr.tournament_id = t.id
        LEFT JOIN playoff_matches pm ON pm.playoff_round_id = pr.id
        LEFT JOIN playoff_sets ps ON ps.playoff_match_id = pm.id
        WHERE t.status = 'published'
      ) as sets_count
  `;

  return {
    tournaments_count: parseInt(stats.tournaments_count),
    matches_count: parseInt(stats.matches_count),
    players_count: parseInt(stats.players_count),
    sets_count: parseInt(stats.sets_count),
  };
}

/**
 * Récupère les 3 derniers vainqueurs de tournois
 */
export async function getRecentWinners() {
  const winners = await sql<RecentWinner[]>`
    WITH derniers_tournois AS (
      SELECT id, name, date
      FROM tournaments
      WHERE status = 'published'
      ORDER BY date DESC
      LIMIT 3
    ),
    finales AS (
      SELECT DISTINCT ON (pr.tournament_id)
        pr.tournament_id,
        pm.winner_team_id
      FROM playoff_rounds pr
      JOIN playoff_matches pm ON pm.playoff_round_id = pr.id
      WHERE pm.winner_team_id IS NOT NULL
      ORDER BY pr.tournament_id, pr.round_number DESC
    )
    SELECT
      dt.id as tournament_id,
      dt.name as tournament_name,
      dt.date as tournament_date,
      p1.name as player1_name,
      p1.photo_url as player1_photo,
      p2.name as player2_name,
      p2.photo_url as player2_photo
    FROM derniers_tournois dt
    LEFT JOIN finales f ON f.tournament_id = dt.id
    LEFT JOIN teams winner_team ON f.winner_team_id = winner_team.id
    LEFT JOIN team_players tp1 ON tp1.team_id = winner_team.id
    LEFT JOIN players p1 ON tp1.player_id = p1.id
    LEFT JOIN team_players tp2 ON tp2.team_id = winner_team.id AND tp2.player_id != p1.id
    LEFT JOIN players p2 ON tp2.player_id = p2.id
    ORDER BY dt.date DESC
  `;

  return winners;
}

/**
 * Récupère le match le plus serré du dernier tournoi (le plus de sets)
 */
export async function getClosestMatch() {
  const [match] = await sql<ClosestMatch[]>`
    WITH dernier_tournoi AS (
      SELECT id
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
        COUNT(ms.id) as nb_sets,
        ARRAY_AGG(ms.team_a_score || '-' || ms.team_b_score ORDER BY ms.set_number) as sets_scores
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
        COUNT(ps.id) as nb_sets,
        ARRAY_AGG(ps.team_a_score || '-' || ps.team_b_score ORDER BY ps.set_number) as sets_scores
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
      tm.match_id,
      tm.match_type,
      tm.nb_sets,
      tm.team_a_score,
      tm.team_b_score,
      tm.sets_scores[1] as set1_score,
      tm.sets_scores[2] as set2_score,
      tm.sets_scores[3] as set3_score,
      p1a.name as player1a_name,
      p2a.name as player2a_name,
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
    ORDER BY tm.nb_sets DESC, tm.team_a_score DESC
    LIMIT 1
  `;

  return match || null;
}

/**
 * Récupère le top 5 des paires par nombre de victoires
 */
export async function getTopTeams() {
  const teams = await sql<TopTeam[]>`
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
      COUNT(DISTINCT t.tournament_id)::integer as nb_tournois
    FROM victoires_totales vt
    JOIN teams t ON vt.team_id = t.id
    JOIN team_players tp1 ON tp1.team_id = t.id
    JOIN players p1 ON tp1.player_id = p1.id
    JOIN team_players tp2 ON tp2.team_id = t.id AND tp2.player_id != p1.id
    JOIN players p2 ON tp2.player_id = p2.id
    GROUP BY vt.team_id, vt.total_victoires, p1.id, p1.name, p1.photo_url, p2.id, p2.name, p2.photo_url
    ORDER BY vt.total_victoires DESC
    LIMIT 5
  `;

  return teams;
}

/**
 * Récupère le top 5 des joueurs par nombre de victoires
 */
export async function getTopPlayers() {
  const players = await sql<TopPlayer[]>`
    WITH victoires_equipes AS (
      SELECT m.winner_team_id as team_id
      FROM matches m
      WHERE m.winner_team_id IS NOT NULL
      UNION ALL
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
      COUNT(DISTINCT t.tournament_id)::integer as nb_tournois
    FROM victoires_par_joueur vp
    JOIN players p ON vp.player_id = p.id
    JOIN team_players tp ON tp.player_id = p.id
    JOIN teams t ON tp.team_id = t.id
    GROUP BY p.id, p.name, p.photo_url, vp.nb_victoires
    ORDER BY vp.nb_victoires DESC
    LIMIT 5
  `;

  return players;
}

/**
 * Récupère le prochain tournoi
 */
export async function getNextTournament() {
  const [tournament] = await sql<NextTournament[]>`
    SELECT id, name, date, location, status
    FROM tournaments
    WHERE status = 'registration' OR status = 'upcoming'
    ORDER BY date ASC
    LIMIT 1
  `;

  return tournament || null;
}
```

## Composants React à créer

### 1. HomeHero.tsx - Section Hero avec image et stats

```tsx
import { getHomeStats } from '@/lib/queries/home-stats';

export default async function HomeHero() {
  const stats = await getHomeStats();

  return (
    <section
      className="relative bg-cover bg-center min-h-[400px]"
      style={{ backgroundImage: "url('/images/hero-padel.jpg')" }}
    >
      {/* Overlay sombre */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1E1E2E]/95 via-[#1E1E2E]/85 to-[#9D7AFA]/30" />

      {/* Contenu */}
      <div className="relative z-10 container mx-auto px-4 py-16 max-w-7xl">

        {/* Titre */}
        <div className="text-center mb-12">
          <h1 className="text-5xl lg:text-7xl font-black text-white mb-4 drop-shadow-2xl">
            Le Tournoi des <span className="bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] bg-clip-text text-transparent">Frérots</span>
          </h1>
          <p className="text-gray-200 text-xl drop-shadow-lg">Vivez la passion du padel en temps réel</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <StatCard value={stats.tournaments_count} label="Tournois" variant="orange" />
          <StatCard value={stats.matches_count} label="Matchs joués" variant="white" />
          <StatCard value={stats.players_count} label="Joueurs actifs" variant="violet" />
          <StatCard value={stats.sets_count} label="Sets disputés" variant="white" />
        </div>

      </div>
    </section>
  );
}

function StatCard({ value, label, variant }: { value: number; label: string; variant: 'orange' | 'violet' | 'white' }) {
  const textColor = variant === 'orange'
    ? 'bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] bg-clip-text text-transparent'
    : variant === 'violet'
    ? 'bg-gradient-to-r from-[#9D7AFA] to-[#B39DFF] bg-clip-text text-transparent'
    : 'text-white';

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-center border border-white/20 hover:bg-white/15 hover:border-[#ff6b35]/50 transition-all duration-300 hover:-translate-y-1">
      <div className={`text-4xl lg:text-5xl font-black mb-2 ${textColor}`}>
        {value.toLocaleString('fr-FR')}
      </div>
      <div className="text-sm text-gray-200 uppercase tracking-wider font-semibold">
        {label}
      </div>
    </div>
  );
}
```

### 2. RecentWinners.tsx - Podium des champions

```tsx
import { getRecentWinners } from '@/lib/queries/home-stats';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Trophy } from 'lucide-react';
import Image from 'next/image';

export default async function RecentWinners() {
  const winners = await getRecentWinners();

  if (!winners || winners.length === 0) return null;

  const podiumOrder = [1, 0, 2]; // Pour afficher 2ème, 1er, 3ème

  return (
    <div className="bg-gradient-to-br from-[#1E1E2E] via-[#252538] to-[#1E1E2E] rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden hover:-translate-y-2 hover:shadow-[0_25px_50px_rgba(157,122,250,0.25)] transition-all duration-400">

      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#ff6b35]/10 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-[#9D7AFA]/10 to-transparent rounded-full blur-3xl" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] p-3 rounded-2xl shadow-[0_0_20px_rgba(255,107,53,0.6)]">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white">Derniers Champions</h2>
            <p className="text-sm text-gray-400">Les 3 derniers vainqueurs de tournois</p>
          </div>
        </div>

        {/* Podium */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {podiumOrder.map((index) => {
            const winner = winners[index];
            if (!winner) return null;

            const rank = index + 1;
            const isFirst = rank === 1;
            const borderColor = rank === 1 ? 'border-yellow-500/40' : rank === 2 ? 'border-gray-400/30' : 'border-orange-600/30';
            const bgGradient = rank === 1
              ? 'from-yellow-500/20 via-yellow-600/10'
              : rank === 2
              ? 'from-gray-400/20 via-gray-500/10'
              : 'from-orange-700/20 via-orange-800/10';
            const badgeGradient = rank === 1
              ? 'from-yellow-400 to-yellow-600'
              : rank === 2
              ? 'from-gray-300 to-gray-500'
              : 'from-orange-400 to-orange-700';

            return (
              <div
                key={winner.tournament_id}
                className={`${index === 1 ? 'md:order-2' : index === 0 ? 'md:order-1' : 'md:order-3'} hover:scale-105 transition-transform duration-300`}
              >
                <div className={`bg-gradient-to-br ${bgGradient} to-transparent rounded-2xl p-${isFirst ? '6' : '5'} border-2 ${borderColor} relative`}>
                  {/* Badge de rang */}
                  <div className={`absolute -top-${isFirst ? '4' : '3'} left-1/2 transform -translate-x-1/2 w-${isFirst ? '12' : '10'} h-${isFirst ? '12' : '10'} bg-gradient-to-br ${badgeGradient} rounded-full flex items-center justify-center text-white font-black text-${isFirst ? 'xl' : 'base'} shadow-lg`}>
                    {rank}
                  </div>

                  <div className="mt-4 text-center">
                    {/* Médaille */}
                    <div className={`text-${isFirst ? '5xl' : '4xl'} mb-${isFirst ? '3' : '2'} ${isFirst ? 'animate-float' : ''}`}>
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                    </div>

                    {/* Tournoi */}
                    <h3 className={`text-white font-${isFirst ? 'bold' : 'semibold'} ${isFirst ? '' : 'text-sm'} mb-1`}>
                      {winner.tournament_name}
                    </h3>
                    <p className="text-xs text-gray-400 mb-${isFirst ? '4' : '3'}">
                      {format(new Date(winner.tournament_date), 'dd MMMM yyyy', { locale: fr })}
                    </p>

                    {/* Joueurs */}
                    <div className={`flex justify-center -space-x-${isFirst ? '4' : '3'} mb-${isFirst ? '3' : '2'}`}>
                      <PlayerAvatar name={winner.player1_name} photo={winner.player1_photo} size={isFirst ? 'lg' : 'md'} />
                      <PlayerAvatar name={winner.player2_name} photo={winner.player2_photo} size={isFirst ? 'lg' : 'md'} />
                    </div>

                    <p className={`text-white font-${isFirst ? 'bold' : 'medium'} text-${isFirst ? 'sm' : 'xs'}`}>
                      {winner.player1_name}
                    </p>
                    <p className={`text-white font-${isFirst ? 'bold' : 'medium'} text-${isFirst ? 'sm' : 'xs'}`}>
                      {winner.player2_name}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PlayerAvatar({ name, photo, size }: { name: string; photo: string | null; size: 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-16 h-16 text-lg' : 'w-12 h-12 text-base';
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);

  const colors = ['from-[#ff6b35] to-[#ff8c42]', 'from-[#9D7AFA] to-[#B39DFF]', 'from-blue-500 to-blue-600', 'from-green-500 to-green-600', 'from-purple-500 to-purple-600'];
  const colorIndex = name.charCodeAt(0) % colors.length;

  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center text-white font-bold border-4 border-[#1E1E2E] shadow-xl`}>
      {photo ? (
        <Image src={photo} alt={name} width={size === 'lg' ? 64 : 48} height={size === 'lg' ? 64 : 48} className="rounded-full" />
      ) : (
        initials
      )}
    </div>
  );
}
```

### 3. Composants restants (ClosestMatch, TopTeams, TopPlayers, NextTournament)

Pour les autres composants, suivre la même structure :
- Fonction async qui récupère les données
- Gestion du cas null/vide
- Design selon le HTML de référence
- Utilisation des composants PlayerAvatar pour la cohérence

## Instructions d'implémentation

### Étape 1 : Gestion de l'image Hero

**Option A : Image locale (recommandée)**
1. Placer l'image dans `/public/images/hero-padel.jpg`
2. Utiliser `backgroundImage: "url('/images/hero-padel.jpg')"`

**Option B : Image depuis la base de données**
Ajouter un champ `hero_image_url` dans la config ou settings

**Option C : Image placeholder Unsplash**
```tsx
style={{ backgroundImage: "url('https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=2000')" }}
```

### Étape 2 : Créer les fichiers dans l'ordre

1. **Types** : `src/types/home-stats.ts`
2. **Queries** : `src/lib/queries/home-stats.ts`
3. **Composants** : Un par un dans `src/components/home/`
4. **Page** : Modifier `src/app/page.tsx` pour assembler tous les composants

### Étape 3 : Structure de la page principale

```tsx
// src/app/page.tsx
import HomeHero from '@/components/home/HomeHero';
import RecentWinners from '@/components/home/RecentWinners';
import ClosestMatch from '@/components/home/ClosestMatch';
import TopTeams from '@/components/home/TopTeams';
import TopPlayers from '@/components/home/TopPlayers';
import NextTournament from '@/components/home/NextTournament';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a14] via-[#1E1E2E] to-[#0f0f1a]">

      {/* Hero avec image et stats */}
      <HomeHero />

      {/* Contenu principal */}
      <div className="container mx-auto px-4 py-12 max-w-7xl">

        {/* Layout asymétrique 3/5 - 2/5 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Colonne gauche (3/5) */}
          <div className="lg:col-span-3 space-y-6">
            <RecentWinners />
            <ClosestMatch />
          </div>

          {/* Colonne droite (2/5) */}
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

### Étape 4 : Tailwind Config

S'assurer que `tailwind.config.js` supporte les animations :

```js
module.exports = {
  theme: {
    extend: {
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
      },
    },
  },
}
```

### Étape 5 : Gestion des avatars

Créer un composant réutilisable `PlayerAvatar` dans `src/components/ui/PlayerAvatar.tsx` qui :
- Affiche la photo si disponible
- Génère des initiales sinon
- Utilise un gradient de couleur basé sur le nom (pour cohérence)
- Supporte différentes tailles (sm, md, lg)

## Points d'attention

1. **Performance**
   - Toutes les requêtes SQL doivent être optimisées
   - Utiliser des index sur `tournament_id`, `team_id`, `player_id`, `winner_team_id`
   - Les composants sont des Server Components (pas de "use client")

2. **Gestion des cas limites**
   - Pas de tournois : afficher un message ou masquer les blocs
   - Pas de finale : ne pas afficher dans les vainqueurs
   - Équipe avec 1 seul joueur : gérer gracefully
   - Photos manquantes : utiliser les initiales

3. **Responsive**
   - Hero : min-h-[400px] sur mobile, plus haut sur desktop
   - Stats : grid 2 cols sur mobile, 4 cols sur desktop
   - Podium : 1 col sur mobile, 3 cols sur desktop
   - Layout principal : 1 col sur mobile, 5 cols (3+2) sur desktop

4. **Accessibilité**
   - Alt text pour toutes les images
   - Contrast ratio correct (overlay sombre sur hero)
   - Focus states sur les boutons

5. **Formatage des dates**
   ```tsx
   import { format } from 'date-fns';
   import { fr } from 'date-fns/locale';

   format(new Date(date), 'dd MMMM yyyy', { locale: fr })
   // Exemple : "15 mars 2025"
   ```

## Checklist de validation

- [ ] L'image hero s'affiche correctement avec l'overlay
- [ ] Les 4 stats affichent les bonnes données
- [ ] Le podium affiche les 3 derniers vainqueurs dans le bon ordre (2-1-3)
- [ ] Les médailles (🥇🥈🥉) s'affichent
- [ ] Le match le plus serré affiche le bon nombre de sets
- [ ] Le top 5 paires est trié par victoires décroissantes
- [ ] Le top 5 joueurs est trié par victoires décroissantes
- [ ] Les avatars affichent les photos ou les initiales
- [ ] Les dates sont formatées en français
- [ ] Le design est responsive (mobile, tablette, desktop)
- [ ] Les effets hover fonctionnent
- [ ] L'animation float fonctionne sur la médaille d'or
- [ ] Le bouton "S'inscrire" du prochain tournoi fonctionne

## Commandes de test

```bash
# Développement
npm run dev

# Build de production
npm run build

# Vérifier les types
npm run type-check
```

Visiter `http://localhost:3000/` pour voir le résultat final.

## Référence du design original

Le fichier `home-v2-avec-hero-image.html` contient le design HTML/CSS complet. En cas de doute sur :
- Les couleurs exactes
- Les espacements
- Les effets de hover
- Les transitions

Se référer à ce fichier pour copier les classes Tailwind exactes.
