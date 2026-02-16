import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { assertAdminToken } from "@/lib/admin";
import {
  countRegistrations,
  getMatchesWithTeamsByPool,
  getPlayoffMatchesWithTeams,
  getPlayoffBracketData,
  getPoolStandings,
  getRegistrationsByStatus,
  getGlobalPaymentConfig,
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
import { PlayoffsAdminTab } from "@/components/tournaments/admin/PlayoffsAdminTab";
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

  const [registrations, counts, teams, teamPlayers, pools, poolTeams, paymentConfig] =
    await Promise.all([
      getRegistrationsByStatus(tournament.id),
      countRegistrations(tournament.id),
      getTeamsByTournament(tournament.id),
      getTeamPlayersByTournament(tournament.id),
      getPoolsByTournament(tournament.id),
      getPoolTeamsByTournament(tournament.id),
      getGlobalPaymentConfig(),
    ]);

  const poolData = await Promise.all(
    pools.map(async (pool) => ({
      pool,
      matches: await getMatchesWithTeamsByPool(tournament.id, pool.id),
      standings: await getPoolStandings(tournament.id, pool.id),
    }))
  );

  const [playoffMatches, playoffBracketData] = await Promise.all([
    getPlayoffMatchesWithTeams(tournament.id),
    getPlayoffBracketData(tournament.id),
  ]);

  const pendingCount = counts.pending ?? 0;
  const approvedCount = counts.approved ?? 0;
  const teamsCount = teams.length;
  const poolsCount = pools.length;
  const matchesCount = poolData.reduce((total, item) => total + item.matches.length, 0);
  const playoffMatchesCount = playoffMatches.length;

  return (
    <div className="min-h-screen bg-[#1E1E2E] text-white">
      <Header />
      <main className="mx-auto w-full max-w-6xl space-y-10 px-6 py-12">
        <div className="rounded-3xl border border-orange-400/30 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent p-6 shadow-card">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 text-xl shadow-md">
              🏆
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="bg-gradient-to-br from-orange-400 to-amber-200 bg-clip-text text-2xl font-semibold text-transparent">
                Configurer le tournoi
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/60">
                <span className="font-semibold text-white/80">{tournament.name}</span>
                <span className="text-white/30">•</span>
                <span>📅 {tournament.date}</span>
                <span className="text-white/30">•</span>
                <span>📍 {tournament.location ?? "Lieu à définir"}</span>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
              {tournament.status}
            </div>
          </div>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="flex h-auto w-full flex-wrap gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 shadow-card">
            <TabsTrigger
              value="pending"
              className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 transition hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-white data-[state=active]:border-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-400 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <span>📋</span>
              <span>À valider</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white/90 group-data-[state=active]:bg-white/30">
                {pendingCount}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="approved"
              className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 transition hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-white data-[state=active]:border-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-400 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <span>✓</span>
              <span>Joueurs</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white/90 group-data-[state=active]:bg-white/30">
                {approvedCount}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="teams"
              className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 transition hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-white data-[state=active]:border-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-400 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <span>👥</span>
              <span>Équipes</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white/90 group-data-[state=active]:bg-white/30">
                {teamsCount}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="pools"
              className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 transition hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-white data-[state=active]:border-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-400 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <span>🏆</span>
              <span>Poules</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white/90 group-data-[state=active]:bg-white/30">
                {poolsCount}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="matches"
              className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 transition hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-white data-[state=active]:border-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-400 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <span>⚔️</span>
              <span>Matchs & Classements</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white/90 group-data-[state=active]:bg-white/30">
                {matchesCount}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="playoffs"
              className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 transition hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-white data-[state=active]:border-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-400 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <span>🏆</span>
              <span>Phases finales</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white/90 group-data-[state=active]:bg-white/30">
                {playoffMatchesCount}
              </span>
            </TabsTrigger>
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
              paymentConfig={paymentConfig}
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
          <TabsContent value="playoffs" className="mt-6">
            <PlayoffsAdminTab
              tournamentId={tournament.id}
              adminToken={adminToken}
              playoffMatches={playoffMatches}
              playoffBracketData={playoffBracketData}
            />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
