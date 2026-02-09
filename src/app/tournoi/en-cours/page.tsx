import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SectionHeader } from "@/components/ui/section-header";
import { PlayerCard } from "@/components/ui/player-card";
import { getActiveTournament, getRegistrationsByStatus, countRegistrations } from "@/lib/queries";

export default async function CurrentTournamentPage() {
  const tournament = await getActiveTournament();

  if (!tournament) {
    return (
      <div className="min-h-screen bg-brand-gray">
        <Header />
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
          <SectionHeader
            title="Tournoi en cours"
            subtitle="Le tournoi actif n&#39;a pas encore été lancé."
          />
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-white p-10 text-center text-sm text-muted-foreground">
            Aucun tournoi actif. L&#39;équipe peut lancer un tournoi depuis la seed Supabase.
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const [approved, counts] = await Promise.all([
    getRegistrationsByStatus(tournament.id, "approved"),
    countRegistrations(tournament.id),
  ]);

  return (
    <div className="min-h-screen bg-brand-gray">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <SectionHeader
          title="Tournoi en cours"
          subtitle="Voici les joueurs validés pour le tournoi actuel."
        />
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
          <span className="rounded-full bg-white px-4 py-2 shadow-sm">
            Validés : <strong>{counts.approved}</strong>
          </span>
          <span className="rounded-full bg-white px-4 py-2 shadow-sm">
            En attente : <strong>{counts.pending}</strong>
          </span>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {approved.length ? (
            approved.map((registration) => (
              <PlayerCard
                key={registration.id}
                player={registration.player}
                status={registration.status}
              />
            ))
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-white p-10 text-center text-sm text-muted-foreground">
              Aucun joueur validé pour le moment.
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
