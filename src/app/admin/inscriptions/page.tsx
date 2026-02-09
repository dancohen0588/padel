import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SectionHeader } from "@/components/ui/section-header";
import { AdminTabs } from "@/components/admin/AdminTabs";
import {
  getFeaturedTournamentPhotos,
  getTournamentPhotos,
  getTournaments,
} from "@/lib/queries";
import { assertAdminToken } from "@/lib/admin";

export default async function AdminInscriptionsPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const adminToken = searchParams.token ?? "";

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

  const [tournaments, photos, featuredPhotos] = await Promise.all([
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
          subtitle={
            "Gère les tournois, photos et contenus de la home."
          }
        />
        <div className="mt-8">
          <AdminTabs
            adminToken={adminToken}
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
