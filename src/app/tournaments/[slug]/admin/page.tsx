import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SectionHeader } from "@/components/ui/section-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { assertAdminToken } from "@/lib/admin";
import {
  countRegistrations,
  getMatchesWithTeamsByPool,
  getPoolStandings,
  getRegistrationsByStatus,
  getTournaments,
  getTeamsByTournament,
  getTeamPlayersByTournament,
  getPoolsByTournament,
  getPoolTeamsByTournament,
} from "@/lib/queries";
import {
  TournamentConfigContent,
} from "@/components/tournaments/admin/TournamentConfigAdmin";
import { MatchesAdminTab } from "@/components/tournaments/admin/MatchesAdminTab";
import { UsersApprovalTab } from "@/components/admin/tabs/UsersApprovalTab";
import { UsersValidatedTab } from "@/components/admin/tabs/UsersValidatedTab";

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

  const [registrations, counts, teams, teamPlayers, pools, poolTeams] =
    await Promise.all([
      getRegistrationsByStatus(tournament.id),
      countRegistrations(tournament.id),
      getTeamsByTournament(tournament.id),
      getTeamPlayersByTournament(tournament.id),
      getPoolsByTournament(tournament.id),
      getPoolTeamsByTournament(tournament.id),
    ]);

  const poolData = await Promise.all(
    pools.map(async (pool) => ({
      pool,
      matches: await getMatchesWithTeamsByPool(tournament.id, pool.id),
      standings: await getPoolStandings(tournament.id, pool.id),
    }))
  );

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

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="flex w-full flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-card">
            <TabsTrigger value="pending">À valider</TabsTrigger>
            <TabsTrigger value="approved">Joueurs</TabsTrigger>
            <TabsTrigger value="teams">Équipes</TabsTrigger>
            <TabsTrigger value="pools">Poules</TabsTrigger>
            <TabsTrigger value="matches">Matchs & Classements</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-6">
            <UsersApprovalTab
              registrations={registrations}
              statusCounts={counts}
              adminToken={adminToken}
            />
          </TabsContent>
          <TabsContent value="approved" className="mt-6">
            <UsersValidatedTab
              registrations={registrations}
              statusCounts={counts}
              adminToken={adminToken}
            />
          </TabsContent>
          <TabsContent value="teams" className="mt-6">
            <TournamentConfigContent
              tournament={tournament}
              adminToken={adminToken}
              registrations={registrations}
              teams={teams}
              teamPlayers={teamPlayers}
              pools={pools}
              poolTeams={poolTeams}
              mode="teams"
            />
          </TabsContent>
          <TabsContent value="pools" className="mt-6">
            <TournamentConfigContent
              tournament={tournament}
              adminToken={adminToken}
              registrations={registrations}
              teams={teams}
              teamPlayers={teamPlayers}
              pools={pools}
              poolTeams={poolTeams}
              mode="pools"
            />
          </TabsContent>
          <TabsContent value="matches" className="mt-6">
            <MatchesAdminTab
              tournamentId={tournament.id}
              pools={pools}
              poolData={poolData}
              adminToken={adminToken}
            />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
