export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeGallery } from "@/components/home/HomeGallery";
import { UpcomingTournaments } from "@/components/home/UpcomingTournaments";
import { RecentWinners } from "@/components/home/RecentWinners";
import { ClosestMatch } from "@/components/home/ClosestMatch";
import { TopTeams } from "@/components/home/TopTeams";
import { TopPlayers } from "@/components/home/TopPlayers";
import {
  getHomeClosestMatch,
  getHomeConfig,
  getHomeRecentWinners,
  getHomeTopPlayers,
  getHomeTopTeams,
} from "@/lib/queries";
import { getDatabaseClient } from "@/lib/database";
import type { TournamentStatus } from "@/lib/types";

export default async function Home() {
  const database = getDatabaseClient();
  const [
    homeConfig,
    statsRows,
    upcomingRows,
    recentWinners,
    closestMatch,
    topTeams,
    topPlayers,
  ] = await Promise.all([
    getHomeConfig(),
    database<
      Array<{
        tournaments: number;
        matches: number;
        players: number;
        sets: number;
      }>
    >`
      select
        (select count(*)::int from tournaments) as tournaments,
        (select count(*)::int from matches where status = 'finished') as matches,
        (
          select count(distinct player_id)::int
          from registrations
          where status = 'approved'
        ) as players,
        (select count(*)::int from match_sets) as sets
    `,
    database<
      Array<{
        id: string;
        slug: string | null;
        name: string;
        date: string;
        location: string | null;
        status: TournamentStatus;
        max_participants: number | null;
        current_participants: string;
        price: number | null;
      }>
    >`
      select
        t.id,
        t.slug,
        t.name,
        t.date::text as date,
        t.location,
        t.status,
        t.max_players as max_participants,
        t.price,
        count(r.id)::text as current_participants
      from tournaments t
      left join registrations r on r.tournament_id = t.id
      where t.status in ('upcoming', 'registration', 'ongoing')
      group by t.id, t.slug, t.name, t.date, t.location, t.status, t.max_players, t.price
      order by t.date asc
      limit 3
    `,
    getHomeRecentWinners(),
    getHomeClosestMatch(),
    getHomeTopTeams(),
    getHomeTopPlayers(),
  ]);

  const stats = statsRows[0] ?? {
    tournaments: 0,
    matches: 0,
    players: 0,
    sets: 0,
  };

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("fr-FR").format(value);

  const heroStats = [
    { label: "Tournois", value: formatNumber(stats.tournaments) },
    { label: "Matchs joués", value: formatNumber(stats.matches) },
    { label: "Joueurs actifs", value: formatNumber(stats.players) },
    { label: "Sets", value: formatNumber(stats.sets) },
  ];

  const upcomingTournaments = upcomingRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    date: row.date,
    location: row.location,
    status: row.status,
    max_participants: row.max_participants,
    current_participants: Number.parseInt(row.current_participants, 10) || 0,
    price: row.price,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a14] via-[#1E1E2E] to-[#0f0f1a] text-white">
      <Header />
      <HomeHero
        title="Le Tournoi des Frérots"
        subtitle="Vivez la passion du padel en temps réel"
        imageUrl={
          homeConfig?.cover_photo_url ??
          "data:image/svg+xml,%3Csvg width='1920' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1920' height='400' fill='%231a1a2e'/%3E%3Cg opacity='0.3'%3E%3Ccircle cx='960' cy='200' r='300' fill='%23ff6b35'/%3E%3Ccircle cx='600' cy='250' r='200' fill='%239D7AFA'/%3E%3Ccircle cx='1320' cy='150' r='180' fill='%234CAF50'/%3E%3C/g%3E%3C/svg%3E"
        }
        stats={heroStats}
      />
      <main className="mx-auto w-full max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <RecentWinners winners={recentWinners} />
            <ClosestMatch match={closestMatch} />
          </div>
          <aside className="space-y-6 lg:col-span-2">
            <TopTeams teams={topTeams} />
            <TopPlayers players={topPlayers} />
            <UpcomingTournaments tournaments={upcomingTournaments} />
          </aside>
        </div>
      </main>
      <HomeGallery />
      <Footer />
    </div>
  );
}
