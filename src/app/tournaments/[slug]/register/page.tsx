import { RegistrationForm } from "@/app/inscription/registration-form";
import { getGlobalPaymentConfig, getTournaments } from "@/lib/queries";
import { registerPlayerForTournament } from "@/app/actions/registrations";

type TournamentRegisterPageProps = {
  params: { slug: string };
};

export default async function TournamentRegisterPage({
  params,
}: TournamentRegisterPageProps) {
  const [tournaments, paymentConfig] = await Promise.all([
    getTournaments("registration"),
    getGlobalPaymentConfig(),
  ]);
  const tournament = tournaments.find((entry) => entry.slug === params.slug);

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#1E1E2E_0%,#2A2A3E_100%)] px-5 py-10 text-white">
      <main className="mx-auto w-full max-w-[600px]">
        <div className="mb-10 text-center">
          <h1 className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-3xl font-bold text-transparent">
            Inscription au Tournoi
          </h1>
          <p className="mt-2 text-sm text-white/60">
            {tournament
              ? `${tournament.name} - Inscris-toi en quelques secondes.`
              : "Rejoins le tournoi du moment en quelques secondes."}
          </p>
        </div>
        {tournament ? (
          <RegistrationForm
            action={async (prevState, formData) => {
              "use server";
              formData.set("slug", tournament.slug ?? "");
              return registerPlayerForTournament(prevState, formData);
            }}
            tournamentId={tournament.id}
            price={tournament.price ?? null}
            paymentConfig={paymentConfig ?? null}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-8 text-center text-sm text-white/60">
            Tournoi introuvable. Vérifie le lien ou reviens plus tard.
          </div>
        )}
      </main>
    </div>
  );
}
