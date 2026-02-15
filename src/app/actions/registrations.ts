"use server";

import { getDatabaseClient } from "@/lib/database";
import { assertAdminToken } from "@/lib/admin";
import type { RegistrationStatus } from "@/lib/types";
import type { Sql } from "postgres";
import { revalidatePath } from "next/cache";
import { updatePlayerPhoto } from "@/app/actions/photo-actions";
import { normalizePhoneNumber } from "@/lib/phone-utils";

type RegistrationResult =
  | { status: "ok"; message: string }
  | { status: "error"; message: string };

type RegistrationMode = "new" | "existing";

type TournamentIdentifier =
  | { id: string }
  | { slug: string };

const normalizePhone = (value: string): string | null => normalizePhoneNumber(value);

const createPlayer = async (
  database: Sql,
  {
    firstName,
    lastName,
    email,
    phone,
    level,
    isRanked,
    ranking,
    playPreference,
  }: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
    level: string;
    isRanked: boolean;
    ranking: string | null;
    playPreference: string;
  }
): Promise<string> => {
  const createdPlayers = await database<Array<{ id: string }>>`
    insert into players (
      email,
      first_name,
      last_name,
      phone,
      level,
      is_ranked,
      ranking,
      play_preference
    )
    values (
      ${email || null},
      ${firstName},
      ${lastName},
      ${phone},
      ${level},
      ${isRanked},
      ${ranking || null},
      ${playPreference}
    )
    returning id
  `;

  if (!createdPlayers[0]?.id) {
    throw new Error("Création joueur échouée.");
  }

  return createdPlayers[0].id;
};

const ensureRegistration = async (
  database: Sql,
  tournamentId: string,
  playerId: string
): Promise<void> => {
  const existingRegistrations = await database<Array<{ id: string }>>`
    select id
    from registrations
    where tournament_id = ${tournamentId} and player_id = ${playerId}
    limit 1
  `;

  if (existingRegistrations.length > 0) {
    throw new Error("Vous êtes déjà inscrit à ce tournoi");
  }

  await database`
    insert into registrations (tournament_id, player_id, status)
    values (${tournamentId}, ${playerId}, 'pending')
  `;
};

const registerForTournament = async (
  database: Sql,
  tournamentId: string,
  formData: FormData
): Promise<RegistrationResult> => {
  const mode = String(formData.get("mode") ?? "new") as RegistrationMode;
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const phone = normalizePhone(rawPhone);

  if (!phone) {
    return { status: "error", message: "Veuillez entrer un numéro de téléphone valide" };
  }

  if (mode === "existing") {
    const playerId = String(formData.get("playerId") ?? "").trim();

    if (!playerId) {
      return { status: "error", message: "Joueur non trouvé." };
    }

    const [player] = await database<Array<{ id: string; phone: string }>>`
      select id, phone
      from players
      where id = ${playerId}
      limit 1
    `;

    if (!player || normalizePhone(player.phone) !== phone) {
      return { status: "error", message: "Joueur non trouvé." };
    }

    await ensureRegistration(database, tournamentId, playerId);

    return {
      status: "ok",
      message:
        "✓ Inscription réussie ! Votre compte a été rattaché à ce tournoi. Votre demande est en attente de validation.",
    };
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const level = String(formData.get("level") ?? "").trim();
  const isRankedValue = String(formData.get("isRanked") ?? "non");
  const isRanked = isRankedValue === "oui";
  const ranking = isRanked ? String(formData.get("ranking") ?? "").trim() : null;
  const playPreference = String(formData.get("playPreference") ?? "aucune").trim();

  if (!firstName || !lastName || !phone || !level) {
    return { status: "error", message: "Champs requis manquants." };
  }

  const existingPlayers = await database<Array<{ id: string }>>`
    select id
    from players
    where CASE
      WHEN phone ~ '^\\+33' THEN '0' || regexp_replace(substring(phone from 4), '[^0-9]', '', 'g')
      ELSE regexp_replace(phone, '[^0-9]', '', 'g')
    END = ${phone.replace(/^\+33/, "0").replace(/\D/g, "")}
    limit 1
  `;

  if (existingPlayers[0]?.id) {
    return {
      status: "error",
      message:
        "Ce numéro de téléphone est déjà utilisé. Veuillez utiliser le mode 'Participant existant' pour vous rattacher à votre compte.",
    };
  }

  const playerId = await createPlayer(database, {
    firstName,
    lastName,
    email,
    phone,
    level,
    isRanked,
    ranking,
    playPreference,
  });

  const playerPhoto = formData.get("player_photo") as File | null;
  if (playerPhoto && playerPhoto.size > 0) {
    const photoData = new FormData();
    photoData.set("player_photo", playerPhoto);
    await updatePlayerPhoto(playerId, photoData);
  }

  await ensureRegistration(database, tournamentId, playerId);

  return {
    status: "ok",
    message:
      "✓ Inscription réussie ! Votre demande est en attente de validation par l'administrateur.",
  };
};

const resolveTournamentId = async (
  database: Sql,
  identifier: TournamentIdentifier
): Promise<string | null> => {
  if ("id" in identifier) {
    return identifier.id;
  }

  const rows = await database<Array<{ id: string }>>`
    select id
    from tournaments
    where slug = ${identifier.slug} and status in ('published', 'registration')
    limit 1
  `;

  return rows[0]?.id ?? null;
};

export async function registerPlayer(
  _prevState: RegistrationResult | null,
  formData: FormData
): Promise<RegistrationResult> {
  try {
    console.info("[db-debug] registerPlayer invoked");
    const database = getDatabaseClient();

    const tournaments = await database<Array<{ id: string }>>`
      select id
      from tournaments
      where status in ('published', 'registration')
      order by date desc, created_at desc
      limit 1
    `;

    const tournament = tournaments[0];

    if (!tournament?.id) {
      return {
        status: "error",
        message: "Aucun tournoi actif pour le moment.",
      };
    }

    return await registerForTournament(database, tournament.id, formData);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

export async function registerPlayerForTournament(
  _prevState: RegistrationResult | null,
  formData: FormData
): Promise<RegistrationResult> {
  try {
    const database = getDatabaseClient();
    const slug = String(formData.get("slug") ?? "").trim();

    if (!slug) {
      return {
        status: "error",
        message: "Tournoi introuvable.",
      };
    }

    const tournamentId = await resolveTournamentId(database, { slug });

    if (!tournamentId) {
      return {
        status: "error",
        message: "Tournoi introuvable.",
      };
    }

    return await registerForTournament(database, tournamentId, formData);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

export async function updateRegistrationStatus(
  registrationId: string,
  status: RegistrationStatus,
  adminToken: string | null
): Promise<RegistrationResult> {
  try {
    assertAdminToken(adminToken);
    const database = getDatabaseClient();
    const updated = await database<Array<{ id: string }>>`
      update registrations
      set status = ${status}
      where id = ${registrationId}
      returning id
    `;

    if (updated.length === 0) {
      return { status: "error", message: "Inscription introuvable." };
    }

    return { status: "ok", message: "Statut mis à jour." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

export async function updateRegistrationStatusAction(
  formData: FormData
): Promise<void> {
  const registrationId = String(formData.get("registrationId") ?? "");
  const status = String(formData.get("status") ?? "") as RegistrationStatus;
  const adminToken = String(formData.get("adminToken") ?? "");

  if (!registrationId || !status) {
    return;
  }

  await updateRegistrationStatus(registrationId, status, adminToken);

  revalidatePath("/admin/inscriptions");
}

export async function deletePlayerAction(formData: FormData): Promise<void> {
  const playerId = String(formData.get("playerId") ?? "");
  const adminToken = String(formData.get("adminToken") ?? "");

  if (!playerId) {
    return;
  }

  assertAdminToken(adminToken);
  const database = getDatabaseClient();
  const deleted = await database<Array<{ id: string }>>`
    delete from players
    where id = ${playerId}
    returning id
  `;

  if (deleted.length === 0) {
    console.info("[db-debug] deletePlayerAction: no player found", playerId);
  }

  revalidatePath("/admin/inscriptions");
}
