import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import Link from "next/link";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeGallery } from "@/components/home/HomeGallery";
import { UpcomingTournaments } from "@/components/home/UpcomingTournaments";
import { ContactModule } from "@/components/home/ContactModule";
import { getHomeConfig } from "@/lib/queries";
import { getDatabaseClient } from "@/lib/database";
import type { TournamentStatus } from "@/lib/types";

const podiumTeams = [
  {
    rank: "🥇",
    teamName: "Les Champions A",
    tournament: "Tournoi de février",
    date: "5 fév. 2026",
    photos: [
      "data:image/svg+xml,%3Csvg width='36' height='36' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='18' cy='18' r='18' fill='%23ff6b35'/%3E%3Ctext x='18' y='24' text-anchor='middle' fill='white' font-size='14' font-weight='bold'%3EA%3C/text%3E%3C/svg%3E",
      "data:image/svg+xml,%3Csvg width='36' height='36' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='18' cy='18' r='18' fill='%23ff8c42'/%3E%3Ctext x='18' y='24' text-anchor='middle' fill='white' font-size='14' font-weight='bold'%3ET%3C/text%3E%3C/svg%3E",
    ],
  },
  {
    rank: "🥈",
    teamName: "Fire Squad",
    tournament: "Tournoi Test 4",
    date: "25 jan. 2026",
    photos: [
      "data:image/svg+xml,%3Csvg width='36' height='36' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='18' cy='18' r='18' fill='%239D7AFA'/%3E%3Ctext x='18' y='24' text-anchor='middle' fill='white' font-size='14' font-weight='bold'%3EJ%3C/text%3E%3C/svg%3E",
      "data:image/svg+xml,%3Csvg width='36' height='36' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='18' cy='18' r='18' fill='%234CAF50'/%3E%3Ctext x='18' y='24' text-anchor='middle' fill='white' font-size='14' font-weight='bold'%3EK%3C/text%3E%3C/svg%3E",
    ],
  },
  {
    rank: "🥉",
    teamName: "Dream Team C",
    tournament: "Tournoi Test 2",
    date: "10 déc. 2025",
    photos: [
      "data:image/svg+xml,%3Csvg width='36' height='36' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='18' cy='18' r='18' fill='%23FFDA77'/%3E%3Ctext x='18' y='24' text-anchor='middle' fill='white' font-size='14' font-weight='bold'%3EL%3C/text%3E%3C/svg%3E",
      "data:image/svg+xml,%3Csvg width='36' height='36' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='18' cy='18' r='18' fill='%23ff6b35'/%3E%3Ctext x='18' y='24' text-anchor='middle' fill='white' font-size='14' font-weight='bold'%3EP%3C/text%3E%3C/svg%3E",
    ],
  },
];

const tightMatch = {
  title: "⚡ Match le plus serré du dernier tournoi",
  leftTeam: {
    name: "Les Champions A",
    score: 2,
    photo:
      "data:image/svg+xml,%3Csvg width='32' height='32' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='16' cy='16' r='16' fill='%23ff6b35'/%3E%3Ctext x='16' y='21' text-anchor='middle' fill='white' font-size='12' font-weight='bold'%3EA%3C/text%3E%3C/svg%3E",
  },
  rightTeam: {
    name: "Masters Pro",
    score: 1,
    photo:
      "data:image/svg+xml,%3Csvg width='32' height='32' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='16' cy='16' r='16' fill='%239D7AFA'/%3E%3Ctext x='16' y='21' text-anchor='middle' fill='white' font-size='12' font-weight='bold'%3EM%3C/text%3E%3C/svg%3E",
  },
  details: "Score : 7-6, 6-7, 7-6 • 42 jeux joués • Durée : 2h15",
};

const topPairs = [
  {
    rank: 1,
    name: "Les Champions A",
    players: "Alex M. • Thomas D.",
    wins: 8,
    trend: "up",
    trendLabel: "↑ +2",
    photos: [
      "data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23ff6b35'/%3E%3Ctext x='20' y='27' text-anchor='middle' fill='white' font-size='16' font-weight='bold'%3EA%3C/text%3E%3C/svg%3E",
      "data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23ff8c42'/%3E%3Ctext x='20' y='27' text-anchor='middle' fill='white' font-size='16' font-weight='bold'%3ET%3C/text%3E%3C/svg%3E",
    ],
  },
  {
    rank: 2,
    name: "Fire Squad",
    players: "Jordan B. • Kevin L.",
    wins: 6,
    trend: "neutral",
    trendLabel: "—",
    photos: [
      "data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='20' fill='%239D7AFA'/%3E%3Ctext x='20' y='27' text-anchor='middle' fill='white' font-size='16' font-weight='bold'%3EJ%3C/text%3E%3C/svg%3E",
      "data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='20' fill='%234CAF50'/%3E%3Ctext x='20' y='27' text-anchor='middle' fill='white' font-size='16' font-weight='bold'%3EK%3C/text%3E%3C/svg%3E",
    ],
  },
  {
    rank: 3,
    name: "Dream Team C",
    players: "Lucas R. • Paul W.",
    wins: 5,
    trend: "up",
    trendLabel: "↑ +1",
    photos: [
      "data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23FFDA77'/%3E%3Ctext x='20' y='27' text-anchor='middle' fill='white' font-size='16' font-weight='bold'%3EL%3C/text%3E%3C/svg%3E",
      "data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23ff6b35'/%3E%3Ctext x='20' y='27' text-anchor='middle' fill='white' font-size='16' font-weight='bold'%3EP%3C/text%3E%3C/svg%3E",
    ],
  },
];

const topPlayers = [
  {
    rank: 1,
    name: "Alex M.",
    note: "Polyvalence : 5 partenaires",
    wins: 10,
    photo:
      "data:image/svg+xml,%3Csvg width='48' height='48' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='24' cy='24' r='24' fill='%23ff6b35'/%3E%3Ctext x='24' y='32' text-anchor='middle' fill='white' font-size='20' font-weight='bold'%3EA%3C/text%3E%3C/svg%3E",
  },
  {
    rank: 2,
    name: "Thomas D.",
    note: "Polyvalence : 3 partenaires",
    wins: 8,
    photo:
      "data:image/svg+xml,%3Csvg width='48' height='48' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='24' cy='24' r='24' fill='%23ff8c42'/%3E%3Ctext x='24' y='32' text-anchor='middle' fill='white' font-size='20' font-weight='bold'%3ET%3C/text%3E%3C/svg%3E",
  },
  {
    rank: 3,
    name: "Jordan B.",
    note: "Polyvalence : 4 partenaires",
    wins: 7,
    photo:
      "data:image/svg+xml,%3Csvg width='48' height='48' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='24' cy='24' r='24' fill='%239D7AFA'/%3E%3Ctext x='24' y='32' text-anchor='middle' fill='white' font-size='20' font-weight='bold'%3EJ%3C/text%3E%3C/svg%3E",
  },
];

const upcomingTournaments = [
  {
    name: "Tournoi Test 4",
    status: "En cours",
    statusStyle: "live",
    details: "Terrain 2 • 14h00",
    icon: "📍",
  },
  {
    name: "Tournoi Test 2",
    status: "À venir",
    statusStyle: "upcoming",
    details: "15 avril 2026",
    icon: "📅",
  },
];

const funFacts = [
  "La rivalité du mois oppose Les Champions A et Fire Squad avec 6 confrontations.",
  "Record de participation : Alex M. présent sur 24 tournois consécutifs !",
];

export default async function Home() {
  const database = getDatabaseClient();
  const [homeConfig, statsRows, upcomingRows] = await Promise.all([
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
        count(r.id)::text as current_participants
      from tournaments t
      left join registrations r on r.tournament_id = t.id
      where t.status in ('upcoming', 'registration', 'ongoing')
      group by t.id, t.slug, t.name, t.date, t.location, t.status, t.max_players
      order by t.date asc
      limit 3
    `,
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
  }));

  return (
    <div className="min-h-screen bg-[#1E1E2E] text-white">
      <Header />
      <HomeHero
        title="🏆 Le tournoi des frérots"
        subtitle="Stats condensées et highlights sur la scène padel."
        imageUrl={
          homeConfig?.cover_photo_url ??
          "data:image/svg+xml,%3Csvg width='1920' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1920' height='400' fill='%231a1a2e'/%3E%3Cg opacity='0.3'%3E%3Ccircle cx='960' cy='200' r='300' fill='%23ff6b35'/%3E%3Ccircle cx='600' cy='250' r='200' fill='%239D7AFA'/%3E%3Ccircle cx='1320' cy='150' r='180' fill='%234CAF50'/%3E%3C/g%3E%3C/svg%3E"
        }
        stats={heroStats}
      />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div>
            <section className="mb-6 rounded-xl border border-white/10 bg-white/5 p-6">
              <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
                <span className="text-lg">🥇</span>
                <h2 className="text-lg font-semibold">Derniers vainqueurs</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {podiumTeams.map((team) => (
                  <div
                    key={team.teamName}
                    className="relative overflow-hidden rounded-lg border border-white/10 bg-white/5 p-4 text-center"
                  >
                    <div className="text-3xl">{team.rank}</div>
                    <div className="mt-2 flex items-center justify-center gap-1">
                      {team.photos.map((photo, index) => (
                        <img
                          key={`${team.teamName}-${index}`}
                          src={photo}
                          alt={team.teamName}
                          className="h-9 w-9 rounded-full border-2 border-white/20 object-cover"
                        />
                      ))}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {team.teamName}
                    </div>
                    <div className="text-xs text-white/60">
                      {team.tournament}
                    </div>
                    <div className="text-[11px] text-white/40">{team.date}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-6 rounded-xl border border-[#ff6b35]/30 bg-gradient-to-br from-[#ff6b35]/10 to-[#9d7afa]/10 p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-white/60">
                {tightMatch.title}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={tightMatch.leftTeam.photo}
                    alt={tightMatch.leftTeam.name}
                    className="h-8 w-8 rounded-full border-2 border-[#ff6b35]/50"
                  />
                  <span className="text-sm font-semibold">
                    {tightMatch.leftTeam.name}
                  </span>
                  <span className="text-xl font-bold text-[#ff6b35]">
                    {tightMatch.leftTeam.score}
                  </span>
                </div>
                <span className="text-xs uppercase text-white/50">vs</span>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-[#ff6b35]">
                    {tightMatch.rightTeam.score}
                  </span>
                  <span className="text-sm font-semibold">
                    {tightMatch.rightTeam.name}
                  </span>
                  <img
                    src={tightMatch.rightTeam.photo}
                    alt={tightMatch.rightTeam.name}
                    className="h-8 w-8 rounded-full border-2 border-[#ff6b35]/50"
                  />
                </div>
              </div>
              <div className="mt-3 border-t border-white/10 pt-3 text-xs text-white/60">
                {tightMatch.details}
              </div>
            </section>

            <section className="mb-6 rounded-xl border border-white/10 bg-white/5 p-6">
              <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
                <span className="text-lg">🏅</span>
                <h2 className="text-lg font-semibold">
                  Top paires - Victoires de tournois
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {topPairs.map((pair) => (
                  <div
                    key={pair.name}
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
                  >
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold ${
                        pair.rank <= 3
                          ? "bg-gradient-to-br from-[#ff6b35] to-[#ff8c42] text-white"
                          : "bg-white/10 text-white/60"
                      }`}
                    >
                      {pair.rank}
                    </div>
                    <div className="flex -space-x-3">
                      {pair.photos.map((photo, index) => (
                        <img
                          key={`${pair.name}-${index}`}
                          src={photo}
                          alt={pair.name}
                          className="h-10 w-10 rounded-full border-2 border-[#1E1E2E] object-cover"
                        />
                      ))}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">
                        {pair.name}
                      </div>
                      <div className="text-xs text-white/60">
                        {pair.players}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-400">
                        {pair.wins}
                      </div>
                      <div className="text-[10px] uppercase text-white/50">
                        Victoires
                      </div>
                    </div>
                    <div
                      className={`rounded px-2 py-1 text-[11px] font-semibold ${
                        pair.trend === "up"
                          ? "bg-green-500/20 text-green-400"
                          : pair.trend === "down"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-white/10 text-white/60"
                      }`}
                    >
                      {pair.trendLabel}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-6">
              <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
                <span className="text-lg">👤</span>
                <h2 className="text-lg font-semibold">
                  Top joueurs - Victoires de tournois
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {topPlayers.map((player) => (
                  <div
                    key={player.name}
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
                  >
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold ${
                        player.rank <= 3
                          ? "bg-gradient-to-br from-[#ff6b35] to-[#ff8c42] text-white"
                          : "bg-white/10 text-white/60"
                      }`}
                    >
                      {player.rank}
                    </div>
                    <img
                      src={player.photo}
                      alt={player.name}
                      className="h-12 w-12 rounded-full border-2 border-[#1E1E2E]"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">
                        {player.name}
                      </div>
                      <div className="text-xs text-white/60">{player.note}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-400">
                        {player.wins}
                      </div>
                      <div className="text-[10px] uppercase text-white/50">
                        Victoires
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <HomeGallery />
          </div>

          <aside className="flex flex-col gap-6">
            <UpcomingTournaments tournaments={upcomingTournaments} />

            <ContactModule />

            <section className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <span>🎲</span>
                <span>Le savais-tu ?</span>
              </div>
              <div className="flex flex-col gap-3 text-xs text-white/80">
                {funFacts.map((fact) => (
                  <div
                    key={fact}
                    className="rounded-lg bg-white/5 p-3 leading-relaxed"
                  >
                    {fact}
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
