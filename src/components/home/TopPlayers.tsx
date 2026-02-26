import Image from "next/image";
import { User } from "lucide-react";
import type { TopPlayer } from "@/types/home-stats";

type TopPlayersProps = {
  players: TopPlayer[];
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
  size = 48,
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
      className="flex items-center justify-center rounded-full border-2 border-[#1E1E2E] bg-white/10 text-sm font-semibold text-white"
      style={{ width: size, height: size }}
    >
      {getInitials(name)}
    </div>
  );
};

export function TopPlayers({ players }: TopPlayersProps) {
  return (
    <section className="rounded-3xl border border-white/5 bg-[#1E1E2E]/90 p-6 shadow-xl backdrop-blur-sm">
      <div className="mb-5 flex items-center gap-2">
        <div className="rounded-lg bg-gradient-to-br from-[#9d7afa] to-[#7a6df0] p-2 text-white shadow-[0_0_18px_rgba(157,122,250,0.45)]">
          <User className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Top joueurs</h2>
          <p className="text-xs text-white/60">Victoires & polyvalence</p>
        </div>
      </div>

      {players.length === 0 ? (
        <p className="text-sm text-white/60">Aucun joueur disponible.</p>
      ) : (
        <div className="space-y-2">
          {players.map((player, index) => (
            <div
              key={player.player_id}
              className={`flex items-center gap-2 rounded-xl border border-white/10 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 ${
                index === 0
                  ? "bg-gradient-to-r from-[#9d7afa]/20 to-transparent border-l-4 border-[#9d7afa]"
                  : "bg-white/5"
              }`}
            >
              <div className="flex shrink-0 items-center gap-2">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                    index < 3
                      ? "bg-gradient-to-br from-[#9d7afa] to-[#7a6df0] text-white"
                      : "bg-white/10 text-white/60"
                  }`}
                >
                  {index + 1}
                </div>
                <Avatar name={player.player_name} photo={player.player_photo} size={32} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">
                  {player.player_name}
                </div>
                <div className="truncate text-xs text-white/60">
                  {player.partners_count} partenaire{player.partners_count > 1 ? "s" : ""}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-lg font-bold text-green-400">
                  {player.total_wins}
                </div>
                <div className="text-[10px] text-white/50">
                  {player.tournament_count} 🏆
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
