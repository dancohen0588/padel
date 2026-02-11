"use client";

import { useState, useTransition } from "react";
import type { MatchSet } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { updateMatchScoresAction } from "@/app/actions/matches";

type MatchScoreModalProps = {
  match: {
    id: string;
    team_a: { name: string | null };
    team_b: { name: string | null };
    sets: MatchSet[];
  };
  onClose: () => void;
  onSaved?: () => void;
  onError?: (message: string) => void;
};

type SetInput = {
  teamA: string;
  teamB: string;
};

const buildInitialSets = (match: MatchScoreModalProps["match"]): SetInput[] => {
  if (!match.sets.length) {
    return [
      { teamA: "", teamB: "" },
      { teamA: "", teamB: "" },
    ];
  }
  return match.sets.map((set) => ({
    teamA: String(set.team_a_games),
    teamB: String(set.team_b_games),
  }));
};

export function MatchScoreModal({ match, onClose, onSaved, onError }: MatchScoreModalProps) {
  const [sets, setSets] = useState<SetInput[]>(buildInitialSets(match));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAddSet = () => {
    setSets((prev) => (prev.length < 5 ? [...prev, { teamA: "", teamB: "" }] : prev));
  };

  const handleRemoveSet = (index: number) => {
    setSets((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = () => {
    const normalized = sets.map((set) => ({
      teamA: set.teamA.trim(),
      teamB: set.teamB.trim(),
    }));

    const hasPartial = normalized.some(
      (set) => (set.teamA && !set.teamB) || (!set.teamA && set.teamB)
    );
    if (hasPartial) {
      setError("Renseigne les deux scores pour chaque set.");
      return;
    }

    const payload = normalized
      .filter((set) => set.teamA !== "" && set.teamB !== "")
      .map((set) => ({
        team1_score: Number(set.teamA),
        team2_score: Number(set.teamB),
      }));

    if (payload.length === 0) {
      setError("Saisis au moins un set.");
      return;
    }

    startTransition(async () => {
      const result = await updateMatchScoresAction(match.id, payload);
      if (!result.success) {
        const message = result.error ?? "Impossible d'enregistrer le score.";
        setError(message);
        onError?.(message);
        return;
      }
      onSaved?.();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
      <div className="w-full max-w-xl rounded-3xl bg-[#2A2A3E] p-8 text-white shadow-2xl transition duration-200 ease-out animate-in fade-in zoom-in-95">
        <div className="text-2xl font-semibold">Modifier le score</div>
        <div className="mt-6 rounded-2xl bg-white/5 p-4">
          <div className="text-xs text-white/50">Match</div>
          <div className="text-lg font-semibold text-white">
            {match.team_a.name ?? "Équipe A"} vs {match.team_b.name ?? "Équipe B"}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {sets.map((set, index) => (
            <div key={`set-${index}`} className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-white/60">
                <span>Set {index + 1}</span>
                {sets.length > 1 ? (
                  <button
                    type="button"
                    className="text-rose-300 hover:text-rose-200"
                    onClick={() => handleRemoveSet(index)}
                  >
                    Retirer
                  </button>
                ) : null}
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <input
                  type="number"
                  min={0}
                  className="rounded-xl border border-white/10 bg-white/10 p-3 text-center text-lg font-semibold text-white focus:border-orange-400 focus:outline-none"
                  value={set.teamA}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSets((prev) =>
                      prev.map((item, idx) => (idx === index ? { ...item, teamA: value } : item))
                    );
                  }}
                />
                <span className="text-white/40">:</span>
                <input
                  type="number"
                  min={0}
                  className="rounded-xl border border-white/10 bg-white/10 p-3 text-center text-lg font-semibold text-white focus:border-orange-400 focus:outline-none"
                  value={set.teamB}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSets((prev) =>
                      prev.map((item, idx) => (idx === index ? { ...item, teamB: value } : item))
                    );
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {sets.length < 5 ? (
          <div className="mt-4">
            <button
              type="button"
              className="text-sm font-semibold text-orange-300 hover:text-orange-200"
              onClick={handleAddSet}
            >
              + Ajouter un set
            </button>
          </div>
        ) : null}

        {error ? <div className="mt-4 text-sm text-rose-300">{error}</div> : null}

        <div className="mt-8 flex gap-3">
          <Button type="button" className="flex-1" onClick={handleSave} disabled={isPending}>
            Enregistrer
          </Button>
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
}
