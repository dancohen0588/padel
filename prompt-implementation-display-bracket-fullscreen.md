# Implémentation : Mode Display Fullscreen pour les Phases Finales

## Contexte technique

**Stack :**
- Next.js 14+ avec App Router
- TypeScript (strict mode)
- PostgreSQL avec requêtes SQL directes (pas de Prisma)
- Tailwind CSS avec thème dark (#1E1E2E)
- Server Actions pour les mutations
- Support des têtes de série (is_seeded) déjà implémenté

**Fichiers principaux concernés :**
- `/src/app/tournaments/[slug]/display/page.tsx` - Nouvelle page display fullscreen (À CRÉER)
- `/src/app/tournaments/[slug]/page.tsx` - Page tournoi existante avec onglet "Phases finales"
- `/src/lib/types.ts` - Types TypeScript
- Base de données : tables `knockout_matches`, `teams`, `team_players`

## Objectif

Créer un **mode display fullscreen** pour afficher le bracket des phases finales sur un écran déporté :
- Affichage du bracket complet : 8èmes → Quarts → Demi → Finale
- Design optimisé pour lisibilité à distance
- Page dédiée accessible via URL `/tournaments/[slug]/display`
- Bouton CTA dans l'onglet "Phases finales" de la page principale
- Mise à jour automatique optionnelle

## Validation visuelle

Un fichier HTML de validation est disponible : `/display-bracket-complete-fullscreen.html`
Il montre exactement le rendu attendu avec :
- 4 colonnes (8èmes, Quarts, Demi, Finale) avec tout visible sans scroll
- Cards de matchs avec équipes, scores, et indicateurs de victoire
- Étoiles ⭐ pour les têtes de série
- Animation pulsante sur la finale
- Header avec titre du tournoi
- Footer avec horloge en temps réel

## Structure des données

### Tables utilisées

```sql
-- Table knockout_matches (phases finales)
CREATE TABLE knockout_matches (
  id UUID PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id),
  round TEXT NOT NULL, -- '8', 'quarter', 'semi', 'final'
  match_number INT NOT NULL, -- Numéro du match dans la phase
  team1_id UUID REFERENCES teams(id),
  team2_id UUID REFERENCES teams(id),
  winner_id UUID REFERENCES teams(id),
  score_team1 INT,
  score_team2 INT,
  played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_knockout_matches_tournament
  ON knockout_matches(tournament_id, round, match_number);
```

### Types TypeScript

Ajouter dans `/src/lib/types.ts` :

```typescript
export type KnockoutMatch = {
  id: string;
  tournament_id: string;
  round: '8' | 'quarter' | 'semi' | 'final';
  match_number: number;
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
  score_team1: number | null;
  score_team2: number | null;
  played_at: string | null;
  created_at: string;
};

export type KnockoutMatchWithTeams = KnockoutMatch & {
  team1: (Team & { players: TeamPlayer[] }) | null;
  team2: (Team & { players: TeamPlayer[] }) | null;
};

export type BracketData = {
  eighths: KnockoutMatchWithTeams[]; // 8 matchs
  quarters: KnockoutMatchWithTeams[]; // 4 matchs
  semis: KnockoutMatchWithTeams[]; // 2 matchs
  final: KnockoutMatchWithTeams | null; // 1 match
};
```

## Implémentation

### 1. Fonction de récupération des données

Créer `/src/lib/queries/knockout.ts` :

```typescript
import { db } from "@/lib/db";
import type { BracketData, KnockoutMatchWithTeams } from "@/lib/types";

export async function getBracketData(tournamentId: string): Promise<BracketData> {
  // Récupérer tous les matchs des phases finales avec les équipes
  const result = await db.query(
    `SELECT
      km.id,
      km.tournament_id,
      km.round,
      km.match_number,
      km.team1_id,
      km.team2_id,
      km.winner_id,
      km.score_team1,
      km.score_team2,
      km.played_at,
      km.created_at,
      -- Team 1
      t1.id as t1_id,
      t1.name as t1_name,
      t1.is_seeded as t1_is_seeded,
      -- Team 2
      t2.id as t2_id,
      t2.name as t2_name,
      t2.is_seeded as t2_is_seeded,
      -- Players Team 1
      array_agg(DISTINCT jsonb_build_object(
        'team_id', tp1.team_id,
        'player_id', tp1.player_id,
        'first_name', p1.first_name,
        'last_name', p1.last_name
      )) FILTER (WHERE tp1.player_id IS NOT NULL) as t1_players,
      -- Players Team 2
      array_agg(DISTINCT jsonb_build_object(
        'team_id', tp2.team_id,
        'player_id', tp2.player_id,
        'first_name', p2.first_name,
        'last_name', p2.last_name
      )) FILTER (WHERE tp2.player_id IS NOT NULL) as t2_players
    FROM knockout_matches km
    LEFT JOIN teams t1 ON km.team1_id = t1.id
    LEFT JOIN teams t2 ON km.team2_id = t2.id
    LEFT JOIN team_players tp1 ON t1.id = tp1.team_id
    LEFT JOIN players p1 ON tp1.player_id = p1.id
    LEFT JOIN team_players tp2 ON t2.id = tp2.team_id
    LEFT JOIN players p2 ON tp2.player_id = p2.id
    WHERE km.tournament_id = $1
    GROUP BY km.id, t1.id, t2.id
    ORDER BY
      CASE km.round
        WHEN '8' THEN 1
        WHEN 'quarter' THEN 2
        WHEN 'semi' THEN 3
        WHEN 'final' THEN 4
      END,
      km.match_number`,
    [tournamentId]
  );

  const matches: KnockoutMatchWithTeams[] = result.rows.map((row) => ({
    id: row.id,
    tournament_id: row.tournament_id,
    round: row.round,
    match_number: row.match_number,
    team1_id: row.team1_id,
    team2_id: row.team2_id,
    winner_id: row.winner_id,
    score_team1: row.score_team1,
    score_team2: row.score_team2,
    played_at: row.played_at,
    created_at: row.created_at,
    team1: row.t1_id ? {
      id: row.t1_id,
      name: row.t1_name,
      is_seeded: row.t1_is_seeded,
      tournament_id: row.tournament_id,
      created_at: '',
      players: row.t1_players || []
    } : null,
    team2: row.t2_id ? {
      id: row.t2_id,
      name: row.t2_name,
      is_seeded: row.t2_is_seeded,
      tournament_id: row.tournament_id,
      created_at: '',
      players: row.t2_players || []
    } : null,
  }));

  return {
    eighths: matches.filter((m) => m.round === '8'),
    quarters: matches.filter((m) => m.round === 'quarter'),
    semis: matches.filter((m) => m.round === 'semi'),
    final: matches.find((m) => m.round === 'final') || null,
  };
}
```

### 2. Page Display Fullscreen

Créer `/src/app/tournaments/[slug]/display/page.tsx` :

```typescript
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getBracketData } from "@/lib/queries/knockout";
import { DisplayBracket } from "@/components/tournaments/DisplayBracket";
import type { Tournament } from "@/lib/types";

type PageProps = {
  params: { slug: string };
};

async function getTournament(slug: string): Promise<Tournament | null> {
  const result = await db.query(
    `SELECT id, name, slug, start_date, end_date, location,
            price, status, max_teams, config, created_at
     FROM tournaments
     WHERE slug = $1`,
    [slug]
  );
  return result.rows[0] || null;
}

export default async function DisplayPage({ params }: PageProps) {
  const tournament = await getTournament(params.slug);

  if (!tournament) {
    notFound();
  }

  const bracketData = await getBracketData(tournament.id);

  return <DisplayBracket tournament={tournament} bracketData={bracketData} />;
}

// Metadata pour la page
export async function generateMetadata({ params }: PageProps) {
  const tournament = await getTournament(params.slug);

  return {
    title: tournament ? `${tournament.name} - Display` : "Tournoi Display",
    description: "Affichage plein écran des phases finales",
  };
}
```

### 3. Composant DisplayBracket

Créer `/src/components/tournaments/DisplayBracket.tsx` :

```typescript
"use client";

import { useEffect, useState } from "react";
import type { Tournament, BracketData, KnockoutMatchWithTeams } from "@/lib/types";

type DisplayBracketProps = {
  tournament: Tournament;
  bracketData: BracketData;
};

export function DisplayBracket({ tournament, bracketData }: DisplayBracketProps) {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);

    return () => clearInterval(interval);
  }, []);

  // Gestion du plein écran avec touche F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="flex h-screen flex-col bg-[#1E1E2E] px-6 py-4">
      {/* En-tête */}
      <div className="mb-4 text-center">
        <h1 className="mb-1 bg-gradient-to-br from-orange-400 to-amber-200 bg-clip-text text-5xl font-bold tracking-tight text-transparent">
          {tournament.name}
        </h1>
        <p className="text-base text-white/50">
          Phases finales - {formatDate(tournament.start_date)}
        </p>
      </div>

      {/* Bracket */}
      <div className="flex-1">
        <div className="grid h-full grid-cols-[2fr_1.5fr_1.2fr_1fr] gap-6 px-4">
          {/* 8èmes de finale */}
          <BracketRound title="8èmes" matches={bracketData.eighths} />

          {/* Quarts de finale */}
          <BracketRound title="Quarts" matches={bracketData.quarters} />

          {/* Demi-finales */}
          <BracketRound title="Demi" matches={bracketData.semis} />

          {/* Finale */}
          <div className="flex flex-col items-center justify-center">
            <div className="mb-6 text-center">
              <div className="inline-block rounded-full border-2 border-amber-400/50 bg-gradient-to-r from-amber-400/30 to-amber-300/20 px-4 py-2 text-base font-bold uppercase tracking-wider text-amber-300 shadow-lg">
                🏆 Finale
              </div>
            </div>
            {bracketData.final ? (
              <MatchCard match={bracketData.final} isFinale />
            ) : (
              <div className="text-white/40">En attente</div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-center gap-4 text-sm text-white/40">
        <div>{currentTime}</div>
        <div className="h-1 w-1 rounded-full bg-white/40" />
        <div>🎾 Padel Tournament</div>
      </div>
    </div>
  );
}

function BracketRound({ title, matches }: { title: string; matches: KnockoutMatchWithTeams[] }) {
  return (
    <div className="flex flex-col">
      <div className="mb-2 text-center">
        <div className="inline-block rounded-full border border-orange-400/30 bg-gradient-to-r from-orange-400/20 to-amber-300/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-300">
          {title}
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-evenly gap-4">
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
}

function MatchCard({ match, isFinale = false }: { match: KnockoutMatchWithTeams; isFinale?: boolean }) {
  const team1IsWinner = match.winner_id === match.team1_id;
  const team2IsWinner = match.winner_id === match.team2_id;
  const hasResult = match.winner_id !== null;

  const cardClasses = isFinale
    ? "rounded-2xl border-2 border-amber-400/60 bg-gradient-to-br from-amber-400/30 to-amber-300/20 p-4 shadow-lg animate-pulse-glow"
    : "rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/2 p-2 backdrop-blur-sm transition-all hover:border-orange-400/40";

  return (
    <div className={cardClasses}>
      <div className="mb-1 text-center text-[10px] font-semibold text-white/40">
        {isFinale ? "Match final" : `M${match.match_number}`}
      </div>
      <div className={isFinale ? "space-y-2.5" : "space-y-1"}>
        <TeamRow
          team={match.team1}
          score={match.score_team1}
          isWinner={team1IsWinner}
          hasResult={hasResult}
          isFinale={isFinale}
        />
        <TeamRow
          team={match.team2}
          score={match.score_team2}
          isWinner={team2IsWinner}
          hasResult={hasResult}
          isFinale={isFinale}
        />
      </div>
      {isFinale && hasResult && (
        <div className="mt-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-300">
            <span>🏆</span>
            <span>Champions</span>
          </div>
        </div>
      )}
      {!hasResult && !isFinale && (
        <div className="mt-1 text-center text-[10px] italic text-white/30">En attente</div>
      )}
    </div>
  );
}

function TeamRow({
  team,
  score,
  isWinner,
  hasResult,
  isFinale,
}: {
  team: KnockoutMatchWithTeams["team1"];
  score: number | null;
  isWinner: boolean;
  hasResult: boolean;
  isFinale: boolean;
}) {
  const baseClasses = "flex items-center justify-between rounded-lg px-3 py-2";
  const winnerClasses = isWinner
    ? "border-l-2 border-emerald-400 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5"
    : hasResult
    ? "bg-white/5 opacity-50"
    : "bg-white/5";

  const textSize = isFinale ? "text-lg" : "text-xs";
  const scoreSize = isFinale ? "text-2xl" : "text-sm";

  if (!team) {
    return (
      <div className={`${baseClasses} bg-white/5`}>
        <span className={`${textSize} font-semibold text-white/40`}>-</span>
        <span className={`${scoreSize} font-bold text-white/30`}>-</span>
      </div>
    );
  }

  return (
    <div className={`${baseClasses} ${winnerClasses}`}>
      <div className="flex items-center gap-2">
        {team.is_seeded && (
          <span className={isFinale ? "text-lg" : "text-xs"} style={{ filter: "drop-shadow(0 1px 3px rgba(251, 191, 36, 0.6))" }}>
            ⭐
          </span>
        )}
        <span className={`${textSize} font-semibold text-white`}>{team.name || "Équipe"}</span>
      </div>
      <span className={`${scoreSize} font-bold ${isWinner ? "text-emerald-400" : "text-white/50"}`}>
        {score ?? "-"}
      </span>
    </div>
  );
}
```

### 4. Ajout du bouton CTA dans l'onglet "Phases finales"

Dans le fichier qui gère l'onglet "Phases finales" (probablement dans `/src/app/tournaments/[slug]/page.tsx` ou un composant associé), ajouter :

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Dans le composant de l'onglet "Phases finales", ajouter ce bouton en haut :

<div className="mb-6 flex items-center justify-between">
  <h2 className="text-2xl font-bold text-white">Phases finales</h2>

  {/* Bouton Display Fullscreen */}
  <Link
    href={`/tournaments/${tournament.slug}/display`}
    target="_blank"
    rel="noopener noreferrer"
    className="group flex items-center gap-2 rounded-xl border border-orange-400/30 bg-gradient-to-br from-orange-400/20 to-orange-500/10 px-4 py-2.5 text-sm font-semibold text-orange-300 shadow-md transition-all hover:translate-y-[-2px] hover:border-orange-400/50 hover:shadow-lg"
  >
    <svg
      className="h-5 w-5 transition-transform group-hover:scale-110"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
      />
    </svg>
    <span>Mode Display</span>
    <span className="text-xs text-orange-300/60">(Nouvel onglet)</span>
  </Link>
</div>
```

Alternative avec icône externe :

```typescript
<Link
  href={`/tournaments/${tournament.slug}/display`}
  target="_blank"
  rel="noopener noreferrer"
  className="group flex items-center gap-2 rounded-xl border border-orange-400/30 bg-gradient-to-br from-orange-400/20 to-orange-500/10 px-4 py-2.5 text-sm font-semibold text-orange-300 shadow-md transition-all hover:translate-y-[-2px] hover:border-orange-400/50 hover:shadow-lg"
>
  <span className="text-lg">🖥️</span>
  <span>Affichage Plein Écran</span>
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
</Link>
```

### 5. Styles CSS additionnels

Ajouter dans `/src/app/globals.css` ou dans un fichier de styles dédié :

```css
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 25px rgba(251, 191, 36, 0.3);
  }
  50% {
    box-shadow: 0 0 40px rgba(251, 191, 36, 0.5);
  }
}

.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}
```

### 6. Configuration Next.js (si nécessaire)

Si vous avez besoin d'un revalidate automatique pour mettre à jour les données :

```typescript
// Dans /src/app/tournaments/[slug]/display/page.tsx
export const revalidate = 30; // Revalide toutes les 30 secondes
```

## Améliorations optionnelles

### Auto-refresh côté client

Ajouter dans le composant `DisplayBracket` :

```typescript
useEffect(() => {
  // Recharger la page toutes les 30 secondes
  const interval = setInterval(() => {
    window.location.reload();
  }, 30000);

  return () => clearInterval(interval);
}, []);
```

### Gestion d'erreur

Ajouter un error.tsx dans `/src/app/tournaments/[slug]/display/` :

```typescript
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-screen items-center justify-center bg-[#1E1E2E]">
      <div className="text-center">
        <h2 className="mb-4 text-2xl font-bold text-white">
          Erreur lors du chargement du bracket
        </h2>
        <button
          onClick={reset}
          className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
```

## Tests à effectuer

1. ✅ Vérifier que la route `/tournaments/[slug]/display` est accessible
2. ✅ Vérifier que tous les matchs sont affichés correctement
3. ✅ Tester l'affichage des têtes de série (étoiles ⭐)
4. ✅ Tester l'indicateur de victoire (bordure verte + fond emerald)
5. ✅ Vérifier que la finale a bien l'animation de pulsation
6. ✅ Tester le bouton "Mode Display" dans l'onglet "Phases finales"
7. ✅ Vérifier que le bouton ouvre bien un nouvel onglet
8. ✅ Tester la touche F pour le plein écran navigateur
9. ✅ Vérifier l'horloge temps réel dans le footer
10. ✅ Tester sur différentes résolutions d'écran

## Notes importantes

- **Performance** : Utiliser `revalidate` pour éviter de surcharger la DB
- **Responsive** : Le layout est optimisé pour des écrans 1920x1080 ou plus
- **Données manquantes** : Gérer les cas où des équipes n'ont pas encore été assignées
- **Score null** : Afficher "-" quand le match n'a pas encore été joué
- **Auto-refresh** : Configurable selon les besoins (commenté par défaut)

## Référence visuelle

Ouvrir `display-bracket-complete-fullscreen.html` dans un navigateur pour voir exactement le rendu final attendu.

## Structure des rounds

- **8èmes** : round = '8', match_number de 1 à 8
- **Quarts** : round = 'quarter', match_number de 1 à 4
- **Demi** : round = 'semi', match_number de 1 à 2
- **Finale** : round = 'final', match_number = 1
