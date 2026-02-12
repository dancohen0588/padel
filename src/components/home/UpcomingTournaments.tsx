import Link from "next/link";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { TournamentStatus } from "@/lib/types";

type UpcomingTournament = {
  id: string;
  slug: string | null;
  name: string;
  date: string;
  location: string | null;
  status: TournamentStatus;
  max_participants: number | null;
  current_participants: number;
};

type UpcomingTournamentsProps = {
  tournaments: UpcomingTournament[];
};

const statusLabel: Record<TournamentStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
  upcoming: "À venir",
  registration: "Inscriptions",
  ongoing: "En cours",
};

const statusClasses: Partial<Record<TournamentStatus, string>> = {
  upcoming: "bg-[#9d7afa]/20 text-[#9d7afa]",
  registration: "bg-[#4caf50]/20 text-[#4caf50]",
  ongoing: "bg-[#ff6b35]/20 text-[#ff6b35]",
};

const formatDate = (value: string) => {
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, "d MMM yyyy", { locale: fr });
};

export function UpcomingTournaments({ tournaments }: UpcomingTournamentsProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span>📅</span>
        <span>Prochains tournois</span>
      </div>
      <div className="flex flex-col gap-3">
        {tournaments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-white/5 p-4 text-xs text-white/60">
            Aucun tournoi planifié pour le moment.
          </div>
        ) : (
          tournaments.map((tournament) => (
            <div
              key={tournament.id}
              className="rounded-lg border border-white/10 bg-white/5 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">{tournament.name}</span>
                <span
                  className={`rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                    statusClasses[tournament.status] ?? "bg-white/10 text-white/60"
                  }`}
                >
                  {statusLabel[tournament.status]}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/60">
                <span>📍</span>
                <span>
                  {tournament.location ?? "Lieu à confirmer"} • {formatDate(tournament.date)}
                </span>
              </div>
              {tournament.max_participants !== null && (
                <div className="mt-1 flex items-center gap-2 text-xs text-white/60">
                  <span>👥</span>
                  <span>
                    {tournament.current_participants} / {tournament.max_participants} inscrits
                    {tournament.current_participants >= tournament.max_participants && (
                      <span className="ml-2 font-semibold text-red-400">• Complet</span>
                    )}
                  </span>
                </div>
              )}
              <div className="mt-3 flex gap-2">
                {tournament.status === "registration" &&
                  (tournament.max_participants === null ||
                    tournament.current_participants < tournament.max_participants) && (
                    <Link
                      href={`/tournaments/${tournament.slug ?? tournament.id}/register`}
                      className="flex-1 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-2 text-xs font-semibold text-white transition hover:from-orange-600 hover:to-orange-700"
                    >
                      S'inscrire
                    </Link>
                  )}

                {tournament.status === "registration" &&
                  tournament.max_participants !== null &&
                  tournament.current_participants >= tournament.max_participants && (
                    <div className="flex-1 inline-flex items-center justify-center rounded-lg border border-red-500/30 bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-400">
                      Complet
                    </div>
                  )}

                {tournament.status === "ongoing" ? (
                  <Link
                    href={`/tournoi/en-cours?tournament=${tournament.id}`}
                    className="w-full inline-flex items-center justify-center rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
                  >
                    Accéder →
                  </Link>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
