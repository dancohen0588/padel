import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/database";
import { normalizePhoneNumber } from "@/lib/phone-utils";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const tournamentId = params.id;
    const body = (await request.json()) as { phone?: string };
    const rawPhone = String(body?.phone ?? "").trim();

    if (!tournamentId) {
      return NextResponse.json(
        { success: false, error: "Tournoi introuvable." },
        { status: 400 }
      );
    }

    if (!rawPhone) {
      return NextResponse.json(
        { success: false, error: "Veuillez entrer un numéro de téléphone valide" },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhoneNumber(rawPhone);
    if (!normalizedPhone) {
      return NextResponse.json(
        {
          success: false,
          error: "Format de téléphone invalide. Utilisez : 06 12 34 56 78 ou +33 6 12 34 56 78",
        },
        { status: 400 }
      );
    }

    const normalizedDigits = normalizedPhone.replace(/^\+33/, "0").replace(/\D/g, "");
    console.info("[verify-phone] lookup", {
      tournamentId,
      rawPhone,
      normalizedPhone,
      normalizedDigits,
    });

    const database = getDatabaseClient();
    const [player] = await database<
      Array<{
        id: string;
        first_name: string;
        last_name: string;
        email: string | null;
        phone: string;
        photo_url: string | null;
        level: string | null;
        is_ranked: boolean | null;
        ranking: string | null;
        play_preference: string | null;
        tournaments_played: number | null;
      }>
    >`
      select
        p.id,
        p.first_name,
        p.last_name,
        p.email,
        p.phone,
        p.photo_url,
        p.level,
        p.is_ranked,
        p.ranking,
        p.play_preference,
        (
          select count(r.id)
          from registrations r
          where r.player_id = p.id
        ) as tournaments_played
      from players p
      where CASE
        WHEN p.phone ~ '^\\+33' THEN '0' || regexp_replace(substring(p.phone from 4), '[^0-9]', '', 'g')
        ELSE regexp_replace(p.phone, '[^0-9]', '', 'g')
      END = ${normalizedDigits}
      limit 1
    `;

    if (!player) {
      return NextResponse.json(
        {
          success: false,
          error: "Nous n'avons pas trouvé de compte lié à ce numéro.",
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
        phone: player.phone,
        photoUrl: player.photo_url,
        level: player.level,
        isRanked: player.is_ranked ?? false,
        ranking: player.ranking,
        playPreference: player.play_preference,
        tournamentsPlayed: player.tournaments_played ?? 0,
      },
    });
  } catch (error) {
    console.error("[verify-phone] error", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      error,
    });
    return NextResponse.json(
      { success: false, error: "Erreur serveur." },
      { status: 500 }
    );
  }
}
