import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/database";

type RequestBody = {
  playerId: string;
  tournamentId: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { playerId, tournamentId } = body;

    if (!playerId || !tournamentId) {
      return NextResponse.json(
        { success: false, error: "playerId et tournamentId requis" },
        { status: 400 }
      );
    }

    const database = getDatabaseClient();

    const [player] = await database<
      Array<{ whatsapp_joined_tournaments: unknown }>
    >`
      select whatsapp_joined_tournaments
      from players
      where id = ${playerId}
    `;

    if (!player) {
      return NextResponse.json(
        { success: false, error: "Joueur introuvable" },
        { status: 404 }
      );
    }

    const currentJoins = (player.whatsapp_joined_tournaments as Array<{
      tournamentId: string;
      joinedAt: string;
    }>) || [];

    const alreadyJoined = currentJoins.some(
      (join) => join.tournamentId === tournamentId
    );

    if (alreadyJoined) {
      return NextResponse.json({ success: true, alreadyJoined: true });
    }

    const updatedJoins = [
      ...currentJoins,
      {
        tournamentId,
        joinedAt: new Date().toISOString(),
      },
    ];

    await database`
      update players
      set whatsapp_joined_tournaments = ${database.json(updatedJoins)}
      where id = ${playerId}
    `;

    return NextResponse.json({ success: true, alreadyJoined: false });
  } catch (error) {
    console.error("[track-whatsapp-join] error", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
