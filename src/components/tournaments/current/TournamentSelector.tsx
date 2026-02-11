"use client";

import { useEffect } from "react";
import type { Tournament } from "@/lib/types";

type TournamentSelectorProps = {
  tournaments: Tournament[];
  value: string;
  onChange: (tournamentId: string) => void;
};

const formatDate = (dateValue: string) => {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const statusLabel: Record<Tournament["status"], string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

const statusClasses: Record<Tournament["status"], string> = {
  draft: "bg-amber-400/20 text-amber-200",
  published: "bg-emerald-500/20 text-emerald-200",
  archived: "bg-white/10 text-white/50",
};

export function TournamentSelector({ tournaments, value, onChange }: TournamentSelectorProps) {
  useEffect(() => {
    if (!value && tournaments[0]) {
      onChange(tournaments[0].id);
    }
  }, [onChange, tournaments, value]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">Sélectionner un tournoi</p>
          <p className="text-xs text-white/60">
            Affichage des tournois publiés par date décroissante.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${
            statusClasses["published"]
          }`}
        >
          {statusLabel.published}
        </span>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr]">
        <div>
          <label htmlFor="tournament-select" className="text-xs text-white/50">
            Tournoi
          </label>
          <div className="mt-2">
            <select
              id="tournament-select"
              className="w-full rounded-xl border border-white/10 bg-[#2A2A3E] px-4 py-3 text-sm text-white shadow-sm focus:border-orange-400 focus:outline-none"
              value={value}
              onChange={(event) => onChange(event.target.value)}
            >
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name} • {formatDate(tournament.date)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
          <p className="text-xs text-white/50">Tournoi sélectionné</p>
          <p className="mt-2 font-semibold text-white">
            {tournaments.find((item) => item.id === value)?.name ?? "—"}
          </p>
          <p className="text-xs text-white/60">
            {value ?
              formatDate(tournaments.find((item) => item.id === value)?.date ?? "")
              : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
