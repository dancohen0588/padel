"use client";

import { useMemo } from "react";
import type { PlayoffBracketData, PlayoffMatch } from "@/types/playoff";
import { cn } from "@/lib/utils";

type PlayoffBracketProps = {
  bracketData: PlayoffBracketData;
  onMatchClick: (matchId: string) => void;
};

const roundSpacing: Record<number, string> = {
  1: "mb-2",
  2: "mb-[42px]",
  3: "mb-[106px]",
  4: "mb-[230px]",
};

export function PlayoffBracket({ bracketData, onMatchClick }: PlayoffBracketProps) {
  const totalSlots = useMemo(
    () =>
      Object.values(bracketData.rounds)
        .flat()
        .reduce((acc) => acc + 2, 0),
    [bracketData.rounds]
  );
  const filledSlots = useMemo(
    () =>
      Object.values(bracketData.rounds)
        .flat()
        .reduce((acc, match) => {
          let filled = 0;
          if (match.team1_id) filled += 1;
          if (match.team2_id) filled += 1;
          return acc + filled;
        }, 0),
    [bracketData.rounds]
  );
  const fillPercentage = totalSlots ? Math.round((filledSlots / totalSlots) * 100) : 0;

  const roundNumbers = useMemo(
    () => Object.keys(bracketData.rounds).map((value) => Number(value)),
    [bracketData.rounds]
  );

  const maxRound = roundNumbers.length ? Math.max(...roundNumbers) : 0;
  const sideRounds = roundNumbers.filter((round) => round < maxRound).sort((a, b) => a - b);
  const finalRoundMatches = maxRound ? bracketData.rounds[maxRound] ?? [] : [];

  const leftRoundsData = useMemo(() => {
    return sideRounds.reduce((acc, round) => {
      const matches = bracketData.rounds[round] ?? [];
      const halfCount = Math.ceil(matches.length / 2);
      acc[round] = matches.slice(0, halfCount);
      return acc;
    }, {} as Record<number, PlayoffMatch[]>);
  }, [bracketData.rounds, sideRounds]);

  const rightRoundsData = useMemo(() => {
    return sideRounds.reduce((acc, round) => {
      const matches = bracketData.rounds[round] ?? [];
      const halfCount = Math.ceil(matches.length / 2);
      acc[round] = matches.slice(halfCount);
      return acc;
    }, {} as Record<number, PlayoffMatch[]>);
  }, [bracketData.rounds, sideRounds]);

  return (
    <div className="space-y-4">
      {totalSlots > 0 && fillPercentage < 100 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-white/70">Remplissage du tableau</span>
            <span className="text-sm font-semibold text-orange-500">{fillPercentage}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500"
              style={{ width: `${fillPercentage}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-white/50">
            Les équipes se qualifient au fur et à mesure des résultats de poules.
          </p>
        </div>
      ) : null}

      <div className="overflow-x-auto py-5">
        <div
          className="grid min-w-[1400px] items-center gap-4"
          style={{
            gridTemplateColumns: "2fr 1.5fr 1fr 0.8fr auto 0.8fr 1fr 1.5fr 2fr",
          }}
        >
          {sideRounds.map((round) => (
            <RoundColumn
              key={`left-${round}`}
              roundNumber={round}
              matches={leftRoundsData[round] ?? []}
              onMatchClick={onMatchClick}
            />
          ))}

          <div className="flex flex-col gap-3">
            <div className="rounded-lg bg-white/5 p-2 text-center text-sm font-semibold uppercase text-white/50">
              Finale
            </div>
            {finalRoundMatches[0] ? (
              <MatchCard
                match={finalRoundMatches[0]}
                onClick={() => onMatchClick(finalRoundMatches[0].id)}
                isFinal
              />
            ) : (
              <EmptyFinal />
            )}
            {bracketData.champion ? (
              <div className="mt-4 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 p-3 text-center">
                <div className="mb-1 text-xs uppercase tracking-wide text-white/80">
                  Champion du tournoi
                </div>
                <div className="text-lg font-bold text-white">
                  {bracketData.champion.name ?? "Champion"}
                </div>
              </div>
            ) : null}
          </div>

          {[...sideRounds].reverse().map((round) => (
            <RoundColumn
              key={`right-${round}`}
              roundNumber={round}
              matches={rightRoundsData[round] ?? []}
              onMatchClick={onMatchClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type RoundColumnProps = {
  roundNumber: number;
  matches: PlayoffMatch[];
  onMatchClick: (matchId: string) => void;
};

function getRoundLabel(matches: PlayoffMatch[], roundNumber: number): string {
  const roundName = matches[0]?.round?.round_name;

  if (roundName) {
    if (roundName.includes("16èmes")) return "16èmes";
    if (roundName.includes("8èmes")) return "8èmes";
    if (roundName.includes("Quarts")) return "Quarts";
    if (roundName.includes("Demi")) return "Demi";
    if (roundName.includes("Finale")) return "Finale";
  }

  return `Round ${roundNumber}`;
}

function RoundColumn({ roundNumber, matches, onMatchClick }: RoundColumnProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg bg-white/5 p-2 text-center text-sm font-semibold uppercase text-white/50">
        {getRoundLabel(matches, roundNumber)}
      </div>
      <div className="flex flex-col">
        {matches.map((match, index) => (
          <div
            key={match.id}
            className={cn(index < matches.length - 1 && roundSpacing[roundNumber])}
          >
            <MatchCard match={match} onClick={() => onMatchClick(match.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}

type MatchCardProps = {
  match: PlayoffMatch;
  onClick: () => void;
  isFinal?: boolean;
};

function MatchCard({ match, onClick, isFinal = false }: MatchCardProps) {
  const team1SetsWon = match.sets?.filter((set) => set.team1_score > set.team2_score).length ?? 0;
  const team2SetsWon = match.sets?.filter((set) => set.team2_score > set.team1_score).length ?? 0;
  const isTeam1Winner = match.winner_id && match.winner_id === match.team1_id;
  const isTeam2Winner = match.winner_id && match.winner_id === match.team2_id;
  const isTeam1Empty = !match.team1_id;
  const isTeam2Empty = !match.team2_id;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative cursor-pointer rounded-lg border border-white/10 bg-white/[0.04] p-2 transition-all hover:-translate-y-0.5 hover:border-orange-500/40 hover:bg-white/[0.06] hover:shadow-xl",
        match.status === "live" && "border-orange-500/60 bg-orange-500/[0.08]",
        isFinal && "border-orange-500/40 bg-orange-500/[0.08] p-4"
      )}
    >
      <div
        className={cn(
          "absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full",
          match.status === "live" && "animate-pulse bg-orange-500",
          match.status === "completed" && "bg-emerald-500",
          match.status === "upcoming" && "bg-white/20"
        )}
      />

      <div
        className={cn(
          "flex items-center justify-between rounded p-1.5 transition-colors",
          isTeam1Winner && "bg-emerald-500/10",
          isTeam1Empty && "opacity-50"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={cn(
              "min-w-[20px] text-center text-xs font-semibold",
              isTeam1Empty ? "text-white/30" : "text-white/50",
              match.team1_seed && match.team1_seed <= 4 && !isTeam1Empty &&
                "bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text font-bold text-transparent"
            )}
          >
            {match.team1_seed ?? "-"}
          </span>
          <span
            className={cn(
              "truncate text-sm font-medium",
              isTeam1Empty ? "text-white/40 italic" : "text-gray-300",
              isTeam1Winner && "font-semibold text-white"
            )}
          >
            {match.team1?.name ?? "En attente"}
          </span>
        </div>
        {match.status !== "upcoming" ? (
          <span
            className={cn(
              "min-w-[24px] text-right text-sm font-semibold",
              isTeam1Winner ? "text-emerald-400" : "text-white/70"
            )}
          >
            {team1SetsWon}
          </span>
        ) : null}
      </div>

      <div className="my-1 h-px bg-white/5" />

      <div
        className={cn(
          "flex items-center justify-between rounded p-1.5 transition-colors",
          isTeam2Winner && "bg-emerald-500/10",
          isTeam2Empty && "opacity-50"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={cn(
              "min-w-[20px] text-center text-xs font-semibold",
              isTeam2Empty ? "text-white/30" : "text-white/50",
              match.team2_seed && match.team2_seed <= 4 && !isTeam2Empty &&
                "bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text font-bold text-transparent"
            )}
          >
            {match.team2_seed ?? "-"}
          </span>
          <span
            className={cn(
              "truncate text-sm font-medium",
              isTeam2Empty ? "text-white/40 italic" : "text-gray-300",
              isTeam2Winner && "font-semibold text-white"
            )}
          >
            {match.team2?.name ?? "En attente"}
          </span>
        </div>
        {match.status !== "upcoming" ? (
          <span
            className={cn(
              "min-w-[24px] text-right text-sm font-semibold",
              isTeam2Winner ? "text-emerald-400" : "text-white/70"
            )}
          >
            {team2SetsWon}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function EmptyFinal() {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-white/5 p-4 text-center text-xs text-white/50">
      Finale à venir
    </div>
  );
}
