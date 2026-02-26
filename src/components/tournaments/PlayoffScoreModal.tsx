"use client";

import { useMemo, useState, useTransition } from "react";
import type { PlayoffMatch } from "@/types/playoff";
import { updatePlayoffMatchScoreAction } from "@/app/actions/playoff-actions";
import { cn } from "@/lib/utils";

type PlayoffScoreModalProps = {
  match: PlayoffMatch;
  onClose: () => void;
  onSaved?: () => void;
  onError?: (message: string) => void;
  adminToken?: string;
};

type SetInput = {
  team1_score: number;
  team2_score: number;
};

const buildInitialSets = (match: PlayoffMatch): SetInput[] => {
  if (match.sets && match.sets.length > 0) {
    return match.sets.map((set) => ({
      team1_score: set.team1_score,
      team2_score: set.team2_score,
    }));
  }
  return [{ team1_score: 0, team2_score: 0 }];
};

export function PlayoffScoreModal({
  match,
  onClose,
  onSaved,
  onError,
  adminToken,
}: PlayoffScoreModalProps) {
  const [isPending, startTransition] = useTransition();
  const [sets, setSets] = useState<SetInput[]>(() => buildInitialSets(match));

  const title = useMemo(() => {
    const team1 = match.team1?.name ?? "Équipe 1";
    const team2 = match.team2?.name ?? "Équipe 2";
    return `${team1} vs ${team2}`;
  }, [match.team1?.name, match.team2?.name]);

  const handleAddSet = () => {
    setSets((prev) => [...prev, { team1_score: 0, team2_score: 0 }].slice(0, 3));
  };

  const handleRemoveSet = (index: number) => {
    setSets((prev) => prev.filter((_, setIndex) => setIndex !== index));
  };

  const handleSave = () => {
    const normalized = sets.map((set) => ({
      team1_score: Number.isFinite(set.team1_score) ? set.team1_score : 0,
      team2_score: Number.isFinite(set.team2_score) ? set.team2_score : 0,
    }));

    startTransition(async () => {
      const result = await updatePlayoffMatchScoreAction(match.id, normalized, adminToken);
      if (!result.success) {
        onError?.(result.error ?? "Erreur inconnue");
        return;
      }
      onSaved?.();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#1E1E2E] p-6 text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-white/50">Phases finales</div>
            <h3 className="mt-1 text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-white/60">Best of 3 • Scores padel</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 transition hover:border-orange-400/40 hover:text-white"
          >
            Fermer
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {sets.map((set, index) => (
            <div
              key={`set-${index}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-white/50">
                <span>Set {index + 1}</span>
                {sets.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveSet(index)}
                    className="text-rose-300 transition hover:text-rose-200"
                  >
                    Retirer
                  </button>
                ) : null}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-2 text-xs font-semibold text-white/70">
                  {match.team1?.name ?? "Équipe 1"}
                  <input
                    type="number"
                    min={0}
                    value={sets[index]?.team1_score ?? 0}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setSets((prev) =>
                        prev.map((set, idx) =>
                          idx === index ? { ...set, team1_score: value } : set
                        )
                      );
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/60"
                  />
                </label>
                <label className="flex flex-col gap-2 text-xs font-semibold text-white/70">
                  {match.team2?.name ?? "Équipe 2"}
                  <input
                    type="number"
                    min={0}
                    value={sets[index]?.team2_score ?? 0}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setSets((prev) =>
                        prev.map((set, idx) =>
                          idx === index ? { ...set, team2_score: value } : set
                        )
                      );
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/60"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleAddSet}
            disabled={sets.length >= 3}
            className={cn(
              "rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 transition",
              sets.length >= 3
                ? "cursor-not-allowed opacity-50"
                : "hover:border-orange-400/40 hover:text-white"
            )}
          >
            Ajouter un set
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className={cn(
              "rounded-full bg-gradient-to-r from-orange-500 to-orange-400 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-md transition",
              isPending && "cursor-wait opacity-70"
            )}
          >
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
