import Image from "next/image";
import { Zap } from "lucide-react";
import type { ClosestMatch } from "@/types/home-stats";

type ClosestMatchProps = {
  match: ClosestMatch | null;
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
  size = 32,
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
      className="flex items-center justify-center rounded-full border-2 border-[#1E1E2E] bg-white/10 text-[10px] font-semibold text-white"
      style={{ width: size, height: size }}
    >
      {getInitials(name)}
    </div>
  );
};

export function ClosestMatch({ match }: ClosestMatchProps) {
  return (
    <section className="rounded-3xl border border-white/5 bg-[#1E1E2E]/90 p-6 shadow-xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-[#9D7AFA] to-[#B39DFF] p-2.5">
          <Zap className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Match le plus serré</h2>
          <p className="text-xs text-gray-500">Dernier tournoi</p>
        </div>
      </div>

      {!match ? (
        <p className="text-sm text-white/60">Aucun match disponible.</p>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-gradient-to-r from-[#9D7AFA]/5 via-transparent to-[#ff6b35]/5 p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <div className="mb-2 flex justify-center gap-1">
                <Avatar name={match.player1a_name} photo={match.player1a_photo} size={48} />
                <Avatar name={match.player2a_name} photo={match.player2a_photo} size={48} />
              </div>
              <p className="text-sm font-semibold text-white">
                {match.player1a_name ?? "Joueur 1"}
              </p>
              <p className="text-sm font-semibold text-white">
                {match.player2a_name ?? "Joueur 2"}
              </p>
            </div>

            <div className="px-6">
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] bg-clip-text text-4xl font-black text-transparent">
                    {match.team_a_score}
                  </div>
                </div>
                <div className="text-2xl text-gray-600">-</div>
                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#9D7AFA] to-[#B39DFF] bg-clip-text text-4xl font-black text-transparent">
                    {match.team_b_score}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-center">
                <span className="inline-flex items-center rounded-full border border-red-500/40 bg-red-500/20 px-3 py-1 text-xs font-bold text-red-400">
                  🔥 {match.nb_sets} sets
                </span>
              </div>
            </div>

            <div className="flex-1 text-center">
              <div className="mb-2 flex justify-center gap-1">
                <Avatar name={match.player1b_name} photo={match.player1b_photo} size={48} />
                <Avatar name={match.player2b_name} photo={match.player2b_photo} size={48} />
              </div>
              <p className="text-sm font-semibold text-white">
                {match.player1b_name ?? "Joueur 1"}
              </p>
              <p className="text-sm font-semibold text-white">
                {match.player2b_name ?? "Joueur 2"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex justify-center gap-2 border-t border-white/5 pt-4">
            <span className="rounded bg-white/5 px-2 py-1 text-xs text-gray-400">Poules</span>
            <span className="rounded bg-white/5 px-2 py-1 text-xs text-gray-400">
              {match.match_type === "playoff" ? "Playoffs" : "Poules"}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
