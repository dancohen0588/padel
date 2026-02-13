import Image from "next/image";
import { Trophy } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { RecentWinner } from "@/types/home-stats";

type RecentWinnersProps = {
  winners: RecentWinner[];
};

const formatDate = (value: string) => {
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, "dd MMMM yyyy", { locale: fr });
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

export function RecentWinners({ winners }: RecentWinnersProps) {
  const podiumOrder = [1, 0, 2];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1E1E2E] via-[#252538] to-[#1E1E2E] p-8 shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_25px_50px_rgba(157,122,250,0.25)]">
      <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-gradient-to-br from-[#ff6b35]/10 to-transparent blur-3xl" />
      <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-gradient-to-tr from-[#9D7AFA]/10 to-transparent blur-3xl" />

      <div className="relative z-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] p-3 shadow-[0_0_20px_rgba(255,107,53,0.6)]">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white">Derniers Champions</h2>
            <p className="text-sm text-gray-400">Les 3 derniers vainqueurs de tournois</p>
          </div>
        </div>

        {winners.length === 0 ? (
          <p className="text-sm text-white/60">Aucun vainqueur disponible.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {podiumOrder.map((index) => {
              const winner = winners[index];
              if (!winner) return null;

              const rank = index + 1;
              const isFirst = rank === 1;
              const borderColor =
                rank === 1
                  ? "border-yellow-500/40"
                  : rank === 2
                    ? "border-gray-400/30"
                    : "border-orange-600/30";
              const bgGradient =
                rank === 1
                  ? "from-yellow-500/20 via-yellow-600/10"
                  : rank === 2
                    ? "from-gray-400/20 via-gray-500/10"
                    : "from-orange-700/20 via-orange-800/10";
              const badgeGradient =
                rank === 1
                  ? "from-yellow-400 to-yellow-600"
                  : rank === 2
                    ? "from-gray-300 to-gray-500"
                    : "from-orange-400 to-orange-700";

              return (
                <div
                  key={winner.tournament_id}
                  className={`transition-transform duration-300 hover:scale-105 ${
                    index === 1 ? "md:order-2" : index === 0 ? "md:order-1" : "md:order-3"
                  }`}
                >
                  <div
                    className={`relative rounded-2xl border-2 bg-gradient-to-br ${bgGradient} to-transparent ${
                      isFirst ? "p-6" : "p-5"
                    } ${borderColor}`}
                  >
                    <div
                      className={`absolute left-1/2 flex items-center justify-center rounded-full bg-gradient-to-br text-white font-black shadow-lg -translate-x-1/2 ${
                        isFirst
                          ? "-top-4 h-12 w-12 text-xl"
                          : "-top-3 h-10 w-10 text-base"
                      } ${badgeGradient}`}
                    >
                      {rank}
                    </div>

                    <div className="mt-4 text-center">
                      <div
                        className={`mb-3 ${
                          isFirst ? "text-5xl animate-float" : "text-4xl"
                        }`}
                      >
                        {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
                      </div>
                      <h3
                        className={`mb-1 text-white ${
                          isFirst ? "font-bold" : "text-sm font-semibold"
                        }`}
                      >
                        {winner.tournament_name}
                      </h3>
                      <p
                        className={`text-xs text-gray-400 ${
                          isFirst ? "mb-4" : "mb-3"
                        }`}
                      >
                        {formatDate(winner.tournament_date)}
                      </p>
                      <div
                        className={`mb-3 flex justify-center ${
                          isFirst ? "-space-x-4" : "-space-x-3"
                        }`}
                      >
                        <Avatar
                          name={winner.player1_name}
                          photo={winner.player1_photo}
                          size={isFirst ? 64 : 48}
                        />
                        <Avatar
                          name={winner.player2_name}
                          photo={winner.player2_photo}
                          size={isFirst ? 64 : 48}
                        />
                      </div>
                      <p
                        className={`text-white ${
                          isFirst ? "text-sm font-bold" : "text-xs font-medium"
                        }`}
                      >
                        {winner.player1_name ?? "Joueur 1"}
                      </p>
                      <p
                        className={`text-white ${
                          isFirst ? "text-sm font-bold" : "text-xs font-medium"
                        }`}
                      >
                        {winner.player2_name ?? "Joueur 2"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </section>
  );
}
