import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HomeHero } from "@/components/home/HomeHero";
import { UpcomingTournaments } from "@/components/home/UpcomingTournaments";

const heroStats = [
  { label: "Tournois", value: "12" },
  { label: "Matchs joués", value: "248" },
  { label: "Joueurs actifs", value: "42" },
  { label: "Sets", value: "816" },
];

const demoTournaments = [
  {
    id: "demo-1",
    slug: null,
    name: "Tournoi Démo 1",
    date: "2026-04-15",
    location: "Padel Club Central",
    status: "registration" as const,
    max_participants: 16,
    current_participants: 10,
    price: 15,
  },
  {
    id: "demo-2",
    slug: null,
    name: "Tournoi Démo 2",
    date: "2026-04-28",
    location: "Urban Padel Arena",
    status: "upcoming" as const,
    max_participants: 32,
    current_participants: 0,
    price: null,
  },
  {
    id: "demo-3",
    slug: null,
    name: "Tournoi Démo 3",
    date: "2026-05-04",
    location: "Sunset Padel",
    status: "ongoing" as const,
    max_participants: null,
    current_participants: 8,
    price: 0,
  },
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[#1E1E2E] text-white">
      <Header />
      <HomeHero
        title="🎯 Démo Home"
        subtitle="Données mock pour valider le rendu sans DB."
        imageUrl="data:image/svg+xml,%3Csvg width='1920' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1920' height='400' fill='%231a1a2e'/%3E%3Cg opacity='0.3'%3E%3Ccircle cx='960' cy='200' r='300' fill='%23ff6b35'/%3E%3Ccircle cx='600' cy='250' r='200' fill='%239D7AFA'/%3E%3Ccircle cx='1320' cy='150' r='180' fill='%234CAF50'/%3E%3C/g%3E%3C/svg%3E"
        stats={heroStats}
      />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <section className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Aperçu mock</h2>
            <p className="mt-2 text-sm text-white/70">
              Cette page sert de bac à sable pour valider le rendu de la home avec
              des données fictives.
            </p>
          </section>
          <aside className="flex flex-col gap-6">
            <UpcomingTournaments tournaments={demoTournaments} />
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
