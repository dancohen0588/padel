type HeroStat = {
  label: string;
  value: string;
};

type HomeHeroProps = {
  title: string;
  subtitle?: string;
  imageUrl: string;
  stats: HeroStat[];
};

const StatCard = ({
  value,
  label,
  variant,
}: {
  value: string;
  label: string;
  variant: "orange" | "violet" | "white";
}) => {
  const textColor =
    variant === "orange"
      ? "bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] bg-clip-text text-transparent"
      : variant === "violet"
        ? "bg-gradient-to-r from-[#9D7AFA] to-[#B39DFF] bg-clip-text text-transparent"
        : "text-white";

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-6 text-center backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#ff6b35]/50 hover:bg-white/15">
      <div className={`text-4xl font-black mb-2 lg:text-5xl ${textColor}`}>
        {value}
      </div>
      <div className="text-sm font-semibold uppercase tracking-wider text-gray-200">
        {label}
      </div>
    </div>
  );
};

export function HomeHero({ title, subtitle, imageUrl, stats }: HomeHeroProps) {
  const highlight = "Frérots";
  const titleParts = title.split(new RegExp(highlight, "i"));
  const hasHighlight = titleParts.length > 1;

  return (
    <section
      className="relative min-h-[400px] bg-cover bg-center"
      style={{ backgroundImage: `url('${imageUrl}')` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#1E1E2E]/95 via-[#1E1E2E]/85 to-[#9D7AFA]/30" />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-16">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-black text-white drop-shadow-2xl mb-4 lg:text-7xl">
            {hasHighlight ? (
              <>
                {titleParts[0]}
                <span className="bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] bg-clip-text text-transparent">
                  {highlight}
                </span>
                {titleParts[1]}
              </>
            ) : (
              title
            )}
          </h1>
          {subtitle ? (
            <p className="text-xl text-gray-200 drop-shadow-lg">{subtitle}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-5xl mx-auto lg:grid-cols-4">
          <StatCard
            value={stats[0]?.value ?? "0"}
            label={stats[0]?.label ?? "Tournois"}
            variant="orange"
          />
          <StatCard
            value={stats[1]?.value ?? "0"}
            label={stats[1]?.label ?? "Matchs joués"}
            variant="white"
          />
          <StatCard
            value={stats[2]?.value ?? "0"}
            label={stats[2]?.label ?? "Joueurs actifs"}
            variant="violet"
          />
          <StatCard
            value={stats[3]?.value ?? "0"}
            label={stats[3]?.label ?? "Sets disputés"}
            variant="white"
          />
        </div>
      </div>
    </section>
  );
}
