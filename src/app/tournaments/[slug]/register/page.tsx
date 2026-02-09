import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SectionHeader } from "@/components/ui/section-header";
import { RegistrationForm } from "@/app/inscription/registration-form";
import { getTournaments } from "@/lib/queries";
import { registerPlayerForTournament } from "@/app/actions/registrations";

type TournamentRegisterPageProps = {
  params: { slug: string };
};

export default async function TournamentRegisterPage({
  params,
}: TournamentRegisterPageProps) {
  const tournaments = await getTournaments("published");
  const tournament = tournaments.find((entry) => entry.slug === params.slug);

  return (
    <div className="min-h-screen bg-brand-gray">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <SectionHeader
          title="Inscription joueur"
          subtitle={
            tournament
              ? `Rejoins ${tournament.name} en quelques secondes. On valide rapidement chaque inscription.`
              : "Rejoins le tournoi du moment en quelques secondes. On valide rapidement chaque inscription."
          }
        />
        <div className="mt-8">
          {tournament ? (
            <RegistrationForm
              action={async (prevState, formData) => {
                "use server";
                formData.set("slug", tournament.slug ?? "");
                return registerPlayerForTournament(prevState, formData);
              }}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
              Tournoi introuvable. Vérifie le lien ou reviens plus tard.
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
