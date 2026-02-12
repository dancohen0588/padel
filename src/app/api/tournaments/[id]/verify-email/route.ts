import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/database";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const tournamentId = params.id;
    const body = (await request.json()) as { email?: string };
    const email = String(body?.email ?? "").trim().toLowerCase();

    if (!tournamentId) {
      return NextResponse.json(
        { success: false, error: "Tournoi introuvable." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Veuillez entrer une adresse email valide" },
        { status: 400 }
      );
    }

    const database = getDatabaseClient();
    const [player] = await database<
      Array<{
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        photo_url: string | null;
        level: string | null;
        tournaments_played: number | null;
      }>
    >`
      select
        p.id,
        p.first_name,
        p.last_name,
        p.email,
        p.photo_url,
        p.level,
        ps.tournaments_played
      from players p
      left join player_stats ps on ps.player_id = p.id
      where lower(p.email) = ${email}
      limit 1
    `;

    if (!player) {
      return NextResponse.json(
        {
          success: false,
          error:
            "✗ Aucun compte trouvé avec cet email. Vérifiez votre adresse ou inscrivez-vous comme nouveau participant.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      player: {
        id: player.id,
        firstName: player.first_name,
        lastName: player.last_name,
        email: player.email,
        photoUrl: player.photo_url,
        level: player.level,
        tournamentsPlayed: player.tournaments_played ?? 0,
      },
    });
  } catch (error) {
    console.error("[verify-email] error", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur." },
      { status: 500 }
    );
  }
}
