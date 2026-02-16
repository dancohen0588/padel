import { redirect } from "next/navigation";
import { DisplayBracket } from "@/components/tournaments/display/DisplayBracket";
import { getActiveDisplayTournaments, getPlayoffBracketData, getTournaments } from "@/lib/queries";

export const revalidate = 30;

type DisplayPageProps = {
  params: { slug: string };
};

export default async function TournamentDisplayPage({ params }: DisplayPageProps) {
  const tournaments = await getActiveDisplayTournaments();
  const fallbackTournaments = tournaments.length ? tournaments : await getTournaments();
  const tournament = fallbackTournaments.find((item) => item.slug === params.slug);

  if (!tournament) {
    redirect("/");
  }

  const bracketData = await getPlayoffBracketData(tournament.id);

  return (
    <div className="h-screen overflow-hidden bg-[#1E1E2E] text-white">
      <DisplayBracket
        tournamentName={tournament.name}
        tournamentDate={tournament.date}
        bracketData={bracketData}
        refreshSeconds={30}
      />
    </div>
  );
}
