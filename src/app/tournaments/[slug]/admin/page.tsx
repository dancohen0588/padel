import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SectionHeader } from "@/components/ui/section-header";
import { assertAdminToken } from "@/lib/admin";
import {
  getRegistrationsByStatus,
  getTournaments,
  getTeamsByTournament,
  getTeamPlayersByTournament,
  getPoolsByTournament,
  getPoolTeamsByTournament,
} from "@/lib/queries";
import { TournamentConfigAdmin } from "@/components/tournaments/admin/TournamentConfigAdmin";

type TournamentAdminPageProps = {
  params: { slug: string };
  searchParams: { token?: string };
};

export default async function TournamentAdminPage({
  params,
  searchParams,
}: TournamentAdminPageProps) {
  const adminToken = searchParams.token ?? "";
  try {
    assertAdminToken(adminToken);
  } catch {
    redirect("/");
  }

  const tournaments = await getTournaments();
  const tournament = tournaments.find((item) => item.slug === params.slug);

  if (!tournament) {
    redirect("/");
  }

  const [registrations, teams, teamPlayers, pools, poolTeams] = await Promise.all([
    getRegistrationsByStatus(tournament.id, "approved"),
    getTeamsByTournament(tournament.id),
    getTeamPlayersByTournament(tournament.id),
    getPoolsByTournament(tournament.id),
    getPoolTeamsByTournament(tournament.id),
  ]);

  return (
    <div className="min-h-screen bg-[#1E1E2E] text-white">
      <Header />
      <main className="mx-auto w-full max-w-6xl space-y-10 px-6 py-12">
        <div className="space-y-4">
          <SectionHeader
            title="Configurer le tournoi"
            subtitle={`${tournament.name} • ${tournament.date} • ${tournament.location ?? "Lieu à définir"}`}
          />
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
            Statut : {tournament.status}
          </div>
        </div>

        <TournamentConfigAdmin
          tournament={tournament}
          adminToken={adminToken}
          registrations={registrations}
          teams={teams}
          teamPlayers={teamPlayers}
          pools={pools}
          poolTeams={poolTeams}
        />
      </main>
      <Footer />
    </div>
  );
}
