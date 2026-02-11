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

export function HomeHero({ title, subtitle, imageUrl, stats }: HomeHeroProps) {
  return (
    <section className="relative h-[220px] w-full overflow-hidden bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] md:h-[240px]">
      <img
        src={imageUrl}
        alt="Terrain de padel"
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(30,30,46,0.3)] to-[rgba(30,30,46,0.9)]" />
      <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col justify-end px-6 py-10">
        <div className="space-y-3">
          <h1 className="bg-gradient-to-br from-[#ff6b35] to-[#ff8c42] bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-sm text-white/70 md:text-base">{subtitle}</p>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-white/80">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-2">
              <span className="text-lg font-semibold text-[#ff6b35]">
                {stat.value}
              </span>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
