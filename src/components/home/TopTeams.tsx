import Image from "next/image";
import { Users } from "lucide-react";
import type { TopTeam } from "@/types/home-stats";

type TopTeamsProps = {
  teams: TopTeam[];
};

const getInitials = (name: string | null) => {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
};

const Avatar = ({
  name,
  photo,
  size = 40,
}: {
  name: string | null;
  photo: string | null;
  size?: number;
}) => {
  if (photo) {
    return (
      <Image
        src={photo}
        alt={name ?? "Joueur"}
        width={size}
        height={size}
        className="rounded-full border-2 border-[#1E1E2E] object-cover"
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full border-2 border-[#1E1E2E] bg-white/10 text-xs font-semibold text-white"
      style={{ width: size, height: size }}
    >
      {getInitials(name)}
    </div>
  );
};

export function TopTeams({ teams }: TopTeamsProps) {
  return (
    <section className="rounded-3xl border border-white/5 bg-[#1E1E2E]/90 p-6 shadow-xl backdrop-blur-sm">
      <div className="mb-5 flex items-center gap-2">
        <div className="rounded-lg bg-gradient-to-br from-[#ff6b35] to-[#ff8c42] p-2 text-white shadow-[0_0_18px_rgba(255,107,53,0.45)]">
          <Users className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Top paires</h2>
          <p className="text-xs text-white/60">Victoires totales</p>
        </div>
      </div>

      {teams.length === 0 ? (
        <p className="text-sm text-white/60">Aucune paire disponible.</p>
      ) : (
        <div className="space-y-2">
          {teams.map((team, index) => (
            <div
              key={team.team_id}
              className={`flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 ${
                index === 0
                  ? "bg-gradient-to-r from-[#ff6b35]/20 to-transparent border-l-4 border-[#ff6b35]"
                  : "bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                    index < 3
                      ? "bg-gradient-to-br from-[#ff6b35] to-[#ff8c42] text-white"
                      : "bg-white/10 text-white/60"
                  }`}
                >
                  {index + 1}
                </div>
                <div className="flex -space-x-3">
                  <Avatar name={team.player1_name} photo={team.player1_photo} size={36} />
                  <Avatar name={team.player2_name} photo={team.player2_photo} size={36} />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">
                  {team.team_name ?? "Équipe"}
                </div>
                <div className="text-xs text-white/60">
                  {team.player1_name && team.player2_name
                    ? `${team.player1_name} • ${team.player2_name}`
                    : "Composition inconnue"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-400">
                  {team.total_wins}
                </div>
                <div className="text-[10px] uppercase text-white/50">Victoires</div>
              </div>
              <div className="rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/70">
                {team.tournament_count} tournois
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
