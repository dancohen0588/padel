import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SectionHeader } from "@/components/ui/section-header";
import { TournamentCard } from "@/components/ui/tournament-card";
import { LeaderboardCard } from "@/components/ui/leaderboard-card";
import { SignupCta } from "@/components/ui/signup-cta";
import { GalleryGrid } from "@/components/ui/gallery-grid";
import { getFeaturedTournamentPhotos, getTournaments } from "@/lib/queries";

export default async function Home() {
  const [tournaments, photos] = await Promise.all([
    getTournaments("published"),
    getFeaturedTournamentPhotos(),
  ]);

  const leaderboard = [
    { rank: 1, name: "Maya / Lou", points: 1240, tournaments: 6, trend: "up" },
    { rank: 2, name: "Sam / Nino", points: 1180, tournaments: 5, trend: "steady" },
    { rank: 3, name: "Jules / Imani", points: 1090, tournaments: 5, trend: "up" },
    { rank: 4, name: "Cam / Rayan", points: 980, tournaments: 4, trend: "down" },
  ] as const;

  const mappedTournaments = tournaments.map((tournament) => ({
    slug: tournament.slug ?? "tournoi",
    name: tournament.name,
    dateLabel: tournament.date,
    location: tournament.location ?? "Lieu à définir",
    priceLabel: "Tarif à venir",
    slotsLabel: tournament.max_players
      ? `${tournament.max_players} joueurs`
      : "Capacité à définir",
    highlight: tournament.status === "published" ? "Publié" : "Nouveau",
  }));

  const galleryPhotos = photos.map((photo) => ({
    id: photo.id,
    url: photo.url,
    caption: photo.caption ?? "Photo du tournoi",
  }));

  return (
    <div className="min-h-screen bg-brand-gray">
      <Header />
      <main className="mx-auto w-full max-w-6xl space-y-16 px-6 py-12">
        <section className="space-y-8">
          <div className="flex flex-col gap-6">
            <p className="inline-flex w-fit items-center rounded-full bg-brand-yellow/30 px-3 py-1 text-xs font-semibold text-brand-charcoal">
              Urban Sport Crew
            </p>
            <div className="space-y-3">
              <h1 className="font-display text-4xl text-brand-charcoal md:text-5xl">
                Padel, vibes &amp; perf — la home des tournois urbains.
              </h1>
              <p className="text-base text-muted-foreground md:text-lg">
                Découvre les prochaines dates, le ranking live et les meilleurs moments en images. L&#39;expérience crew, sans friction.
              </p>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {mappedTournaments.map((tournament) => (
              <TournamentCard key={tournament.slug} {...tournament} />
            ))}
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="space-y-4">
            <SectionHeader
              title="Leaderboard crew"
              subtitle="Les duos les plus réguliers, mis à jour après chaque tournoi."
            />
            <LeaderboardCard entries={leaderboard} />
          </div>
          <div className="space-y-4">
            <SectionHeader
              title="On se rejoint ?"
              subtitle="Inscris-toi pour recevoir l’ouverture des prochains tournois."
            />
            <SignupCta />
          </div>
        </section>

        <section className="space-y-6">
          <SectionHeader
            title="Galerie du tournoi"
            subtitle="Moments forts, smashes décisifs et vibes 100% padel."
          />
          <GalleryGrid photos={galleryPhotos} />
        </section>
      </main>
      <Footer />
    </div>
  );
}
