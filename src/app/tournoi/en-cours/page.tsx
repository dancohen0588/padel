import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SectionHeader } from "@/components/ui/section-header";
import { getActiveDisplayTournaments } from "@/lib/queries";
import { CurrentTournamentClient } from "@/components/tournaments/current/CurrentTournamentClient";

export default async function CurrentTournamentPage() {
  const tournaments = await getActiveDisplayTournaments();

  return (
    <div className="min-h-screen bg-[#1E1E2E] text-white">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <SectionHeader
          title="Tournoi en cours"
          subtitle="Suivez l'avancement des tournois publiés ou en cours et les résultats en direct."
          className="text-white"
        />
        {tournaments.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-white/20 bg-white/5 p-10 text-center text-sm text-white/70">
            Aucun tournoi publié ou en cours n&apos;est disponible pour le moment.
          </div>
        ) : (
          <CurrentTournamentClient tournaments={tournaments} />
        )}
      </main>
      <Footer />
    </div>
  );
}
