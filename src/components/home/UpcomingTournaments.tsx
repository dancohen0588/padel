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
    <section className="rounded-3xl border border-white/5 bg-gradient-to-br from-[#ff6b35] via-[#ff7942] to-[#ff8c42] p-6 text-white shadow-2xl">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">📅</span>
        <div>
          <h2 className="text-lg font-semibold">Prochains tournois</h2>
          <p className="text-xs text-white/80">Réserve ta place ou suis l'action</p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {tournaments.length === 0 ? (
          <div className="rounded-2xl border border-white/30 bg-white/10 p-4 text-xs text-white/90">
            Aucun tournoi planifié pour le moment.
          </div>
        ) : (
          tournaments.map((tournament) => (
            <div
              key={tournament.id}
              className="rounded-2xl border border-white/30 bg-white/10 p-4 backdrop-blur-sm"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{tournament.name}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-white/80">
                    <span>📍</span>
                    <span>
                      {tournament.location ?? "Lieu à confirmer"} • {formatDate(tournament.date)}
                    </span>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                    statusClasses[tournament.status] ?? "bg-white/20 text-white"
                  }`}
                >
                  {statusLabel[tournament.status]}
                </span>
              </div>
              {tournament.max_participants !== null && (
                <div className="mt-1 flex items-center gap-2 text-xs text-white/80">
                  <span>👥</span>
                  <span>
                    {tournament.current_participants} / {tournament.max_participants} inscrits
                    {tournament.current_participants >= tournament.max_participants && (
                      <span className="ml-2 font-semibold text-white">• Complet</span>
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
                      className="flex-1 inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#ff6b35] transition hover:scale-[1.01] hover:bg-white/90"
                    >
                      S'inscrire
                    </Link>
                  )}

                {tournament.status === "registration" &&
                  tournament.max_participants !== null &&
                  tournament.current_participants >= tournament.max_participants && (
                    <div className="flex-1 inline-flex items-center justify-center rounded-xl border border-white/40 bg-white/10 px-3 py-2 text-xs font-semibold text-white">
                      Complet
                    </div>
                  )}

                {tournament.status === "ongoing" ? (
                  <Link
                    href={`/tournoi/en-cours?tournament=${tournament.id}`}
                    className="w-full inline-flex items-center justify-center rounded-xl border border-white/60 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
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
