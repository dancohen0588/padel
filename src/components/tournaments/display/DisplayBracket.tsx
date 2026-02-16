"use client";

import { useEffect, useMemo } from "react";
import type { PlayoffBracketData, PlayoffMatch } from "@/types/playoff";
import { cn } from "@/lib/utils";

type DisplayBracketProps = {
  tournamentName: string;
  tournamentDate?: string | null;
  bracketData: PlayoffBracketData;
  refreshSeconds?: number;
};

type RoundLabel = "8èmes" | "Quarts" | "Demi" | "Finale";

const roundOrder: RoundLabel[] = ["8èmes", "Quarts", "Demi", "Finale"];

const getLabelFromName = (roundName?: string | null): RoundLabel | null => {
  if (!roundName) return null;
  if (roundName.includes("8èmes")) return "8èmes";
  if (roundName.includes("Quarts")) return "Quarts";
  if (roundName.includes("Demi")) return "Demi";
  if (roundName.includes("Finale")) return "Finale";
  return null;
};

const getLabelFromRoundNumber = (roundNumber: number): RoundLabel => {
  const index = Math.max(0, Math.min(roundOrder.length - 1, roundNumber - 1));
  return roundOrder[index];
};

const getRoundLabel = (matches: PlayoffMatch[], roundNumber: number): RoundLabel => {
  return getLabelFromName(matches[0]?.round?.round_name) ?? getLabelFromRoundNumber(roundNumber);
};

const sortedByMatchNumber = (matches: PlayoffMatch[]) =>
  [...matches].sort((a, b) => a.match_number - b.match_number);

export function DisplayBracket({
  tournamentName,
  tournamentDate,
  bracketData,
  refreshSeconds = 30,
}: DisplayBracketProps) {
  const roundsByLabel = useMemo(() => {
    const entries = Object.entries(bracketData.rounds)
      .map(([roundNumber, matches]) => ({
        roundNumber: Number(roundNumber),
        matches: sortedByMatchNumber(matches),
      }))
      .filter((item) => Number.isFinite(item.roundNumber));

    return entries.reduce<Record<RoundLabel, PlayoffMatch[]>>((acc, item) => {
      const label = getRoundLabel(item.matches, item.roundNumber);
      acc[label] = item.matches;
      return acc;
    }, { "8èmes": [], Quarts: [], Demi: [], Finale: [] });
  }, [bracketData.rounds]);

  useEffect(() => {
    const entries = Object.entries(bracketData.rounds)
      .map(([roundNumber, matches]) => ({
        roundNumber: Number(roundNumber),
        label: getRoundLabel(matches, Number(roundNumber)),
        count: matches.length,
      }))
      .sort((a, b) => a.roundNumber - b.roundNumber);

    console.info(
      "[display-bracket] round mapping",
      JSON.stringify(
        {
          rounds: entries,
          totals: {
            "8èmes": roundsByLabel["8èmes"].length,
            Quarts: roundsByLabel.Quarts.length,
            Demi: roundsByLabel.Demi.length,
            Finale: roundsByLabel.Finale.length,
          },
        },
        null,
        2
      )
    );
  }, [bracketData.rounds, roundsByLabel]);

  useEffect(() => {
    if (!refreshSeconds) return;
    const timer = window.setInterval(() => {
      window.location.reload();
    }, refreshSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [refreshSeconds]);

  const finalMatch = roundsByLabel.Finale[0];

  return (
    <div className="flex h-screen flex-col px-6 py-4 text-white">
      <div className="mb-4 text-center">
        <h1 className="gradient-text mb-1 text-5xl font-bold tracking-tight">
          {tournamentName}
        </h1>
        <p className="text-base text-white/50">
          Phases finales{tournamentDate ? ` - ${tournamentDate}` : ""}
        </p>
      </div>

      <div className="flex-1">
        <div className="bracket-container h-full">
          {roundOrder.slice(0, 3).map((label) => (
            <RoundColumn key={label} label={label} matches={roundsByLabel[label]} />
          ))}

          <div className="bracket-round flex items-center">
            <div className="w-full">
              <div className="mb-4 text-center">
                <div className="phase-label inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-300">
                  Finale
                </div>
              </div>
              <div className="finale-badge relative rounded-2xl p-4">
                {finalMatch ? (
                  <FinaleCard match={finalMatch} />
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-white/40">
                    Finale à venir
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-sm text-white/40">
        <span>Affichage plein écran</span>
        <span>•</span>
        <span>Actualisation auto: {refreshSeconds}s</span>
      </div>
    </div>
  );
}

type RoundColumnProps = {
  label: RoundLabel;
  matches: PlayoffMatch[];
};

function RoundColumn({ label, matches }: RoundColumnProps) {
  return (
    <div className="bracket-round">
      <div className="bracket-round-header">
        <div className="phase-label inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-300">
          {label}
        </div>
      </div>
      <div className="matches-grid">
        {matches.length ? (
          matches.map((match) => <MatchCard key={match.id} match={match} />)
        ) : (
          <EmptyMatchCard />
        )}
      </div>
    </div>
  );
}

type MatchCardProps = {
  match: PlayoffMatch;
};

function MatchCard({ match }: MatchCardProps) {
  const team1SetsWon = match.sets?.filter((set) => set.team1_score > set.team2_score).length ?? 0;
  const team2SetsWon = match.sets?.filter((set) => set.team2_score > set.team1_score).length ?? 0;
  const isTeam1Winner = match.winner_id && match.winner_id === match.team1_id;
  const isTeam2Winner = match.winner_id && match.winner_id === match.team2_id;

  return (
    <div className="match-card rounded-xl p-2">
      <div className="mb-1 text-center text-[10px] font-semibold text-white/40">
        M{match.match_number}
      </div>
      <div className="space-y-1">
        <TeamRow
          name={match.team1?.name ?? "En attente"}
          score={team1SetsWon}
          isWinner={Boolean(isTeam1Winner)}
          isLoser={Boolean(match.winner_id && !isTeam1Winner)}
          isSeeded={Boolean(match.team1?.is_seeded)}
        />
        <TeamRow
          name={match.team2?.name ?? "En attente"}
          score={team2SetsWon}
          isWinner={Boolean(isTeam2Winner)}
          isLoser={Boolean(match.winner_id && !isTeam2Winner)}
          isSeeded={Boolean(match.team2?.is_seeded)}
        />
      </div>
    </div>
  );
}

function FinaleCard({ match }: { match: PlayoffMatch }) {
  const team1SetsWon = match.sets?.filter((set) => set.team1_score > set.team2_score).length ?? 0;
  const team2SetsWon = match.sets?.filter((set) => set.team2_score > set.team1_score).length ?? 0;
  const isTeam1Winner = match.winner_id && match.winner_id === match.team1_id;
  const isTeam2Winner = match.winner_id && match.winner_id === match.team2_id;

  return (
    <div className="space-y-2.5">
      <TeamRow
        name={match.team1?.name ?? "En attente"}
        score={team1SetsWon}
        isWinner={Boolean(isTeam1Winner)}
        isLoser={Boolean(match.winner_id && !isTeam1Winner)}
        isSeeded={Boolean(match.team1?.is_seeded)}
        size="lg"
      />
      <TeamRow
        name={match.team2?.name ?? "En attente"}
        score={team2SetsWon}
        isWinner={Boolean(isTeam2Winner)}
        isLoser={Boolean(match.winner_id && !isTeam2Winner)}
        isSeeded={Boolean(match.team2?.is_seeded)}
        size="lg"
      />
    </div>
  );
}

type TeamRowProps = {
  name: string;
  score: number;
  isWinner: boolean;
  isLoser: boolean;
  isSeeded: boolean;
  size?: "sm" | "lg";
};

function TeamRow({ name, score, isWinner, isLoser, isSeeded, size = "sm" }: TeamRowProps) {
  return (
    <div
      className={cn(
        "match-team flex items-center justify-between rounded-lg bg-white/5 px-2 py-1.5",
        size === "lg" && "rounded-xl bg-black/20 px-4 py-3",
        isWinner && "winner",
        isLoser && "loser"
      )}
    >
      <div className="flex items-center gap-1.5">
        {isSeeded ? (
          <span className="seeded-star text-xs" aria-hidden>
            ⭐
          </span>
        ) : null}
        <span className={cn("text-xs font-semibold text-white", size === "lg" && "text-sm")}>
          {name}
        </span>
      </div>
      <span
        className={cn(
          "text-sm font-bold",
          isWinner ? "text-emerald-400" : "text-white/50"
        )}
      >
        {score}
      </span>
    </div>
  );
}

function EmptyMatchCard() {
  return (
    <div className="match-card rounded-xl p-2 text-center text-xs text-white/40">À venir</div>
  );
}
