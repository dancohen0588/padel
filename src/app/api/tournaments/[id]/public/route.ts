import { NextResponse } from "next/server";
import {
  checkIfTournamentStarted,
  getTournamentWithAllData,
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

  const hasStarted = await checkIfTournamentStarted(tournamentId);

  return NextResponse.json({
    ...data,
    hasStarted,
  });
}
