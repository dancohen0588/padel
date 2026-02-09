import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SectionHeader } from "@/components/ui/section-header";
import { AdminTabs } from "@/components/admin/AdminTabs";
import {
  countRegistrations,
  getActiveTournament,
  getFeaturedTournamentPhotos,
  getRegistrationsByStatus,
  getTournamentPhotos,
  getTournaments,
} from "@/lib/queries";
import { assertAdminToken } from "@/lib/admin";
import type { RegistrationWithPlayer } from "@/lib/types";

export default async function AdminInscriptionsPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const adminToken = searchParams.token ?? "";
  const tournament = await getActiveTournament();

  try {
    assertAdminToken(adminToken);
  } catch {
    return (
      <div className="min-h-screen bg-brand-gray">
        <Header />
        <main className="mx-auto w-full max-w-5xl px-6 py-10">
          <SectionHeader
            title="Admin inscriptions"
            subtitle="Token admin invalide. Ajoute ?token=ADMIN_TOKEN à l’URL."
          />
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
            Exemple : /admin/inscriptions?token=VOTRE_TOKEN
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-brand-gray">
        <Header />
        <main className="mx-auto w-full max-w-5xl px-6 py-10">
          <SectionHeader
            title="Admin inscriptions"
            subtitle="Aucun tournoi publié. Mets un tournoi en statut published."
          />
        </main>
        <Footer />
      </div>
    );
  }

  const [registrations, counts, tournaments, photos, featuredPhotos] =
    await Promise.all([
      getRegistrationsByStatus(tournament.id),
      countRegistrations(tournament.id),
      getTournaments(),
      getTournamentPhotos(),
      getFeaturedTournamentPhotos(),
    ]);

  return (
    <div className="min-h-screen bg-brand-gray">
      <Header />
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <SectionHeader
          title="Admin inscriptions"
          subtitle="Valide ou refuse les joueurs du tournoi en cours."
        />
        <div className="mt-8">
          <AdminTabs
            registrations={registrations as RegistrationWithPlayer[]}
            adminToken={adminToken}
            statusCounts={counts}
            tournaments={tournaments}
            photos={photos}
            featuredPhotos={featuredPhotos}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
