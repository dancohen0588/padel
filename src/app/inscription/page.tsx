export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SectionHeader } from "@/components/ui/section-header";
import { RegistrationForm } from "@/app/inscription/registration-form";
import { getActiveTournament, getGlobalPaymentConfig } from "@/lib/queries";

export default async function InscriptionPage() {
  const [tournament, paymentConfig] = await Promise.all([
    getActiveTournament(),
    getGlobalPaymentConfig(),
  ]);

  return (
    <div className="min-h-screen bg-brand-gray">
      <Header />
      <main className="mx-auto w-full px-6 py-10">
        <SectionHeader
          title="Inscription joueur"
          subtitle="Rejoins le tournoi du moment en quelques secondes. On valide rapidement chaque inscription."
        />
        <div className="mt-8">
          {tournament ? (
            <RegistrationForm
              tournamentId={tournament.id}
              price={tournament.price ?? null}
              paymentConfig={paymentConfig ?? null}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
              Aucun tournoi actif. Demande à l&#39;orga de créer le tournoi du mois.
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
