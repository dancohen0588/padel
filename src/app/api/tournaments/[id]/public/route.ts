import { NextResponse } from "next/server";
import {
  checkIfTournamentStarted,
  getTournamentWithAllData,
  getPlayoffBracketData,
  getPlayoffMatchesWithTeams,
  getConsolationMatchesWithTeams,
  getConsolationBracketData,
} from "@/lib/queries";

type RouteParams = {
  params: { id: string };
};

export async function GET(request: Request, { params }: RouteParams) {
  const tournamentId = params.id;
  if (!tournamentId) {
    return NextResponse.json({ error: "Tournoi introuvable" }, { status: 404 });
  }

  const data = await getTournamentWithAllData(tournamentId);
  if (!data.tournament) {
    return NextResponse.json({ error: "Tournoi introuvable" }, { status: 404 });
  }

  const [hasStarted, playoffMatches, playoffBracketData, consolationMatches, consolationBracketData] =
    await Promise.all([
      checkIfTournamentStarted(tournamentId),
      getPlayoffMatchesWithTeams(tournamentId),
      getPlayoffBracketData(tournamentId),
      getConsolationMatchesWithTeams(tournamentId),
      getConsolationBracketData(tournamentId),
    ]);

  return NextResponse.json({
    ...data,
    hasStarted,
    playoffMatches,
    playoffBracketData,
    consolationMatches,
    consolationBracketData,
  });
}
