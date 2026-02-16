"use server";

import { getDatabaseClient } from "@/lib/database";
import { assertAdminToken } from "@/lib/admin";
import type { RegistrationStatus } from "@/lib/types";
import type { Sql } from "postgres";
import { revalidatePath } from "next/cache";
import { updatePlayerPhoto } from "@/app/actions/photo-actions";
import { normalizePhoneNumber } from "@/lib/phone-utils";

type RegistrationSuccess = {
  status: "ok";
  message: string;
  playerId: string;
  registrationId: string;
  tournamentId: string;
  whatsappGroupLink: string | null;
  hasAlreadyJoined: boolean;
};

type RegistrationResult =
  | RegistrationSuccess
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
): Promise<string> => {
  const existingRegistrations = await database<Array<{ id: string }>>`
    select id
    from registrations
    where tournament_id = ${tournamentId} and player_id = ${playerId}
    limit 1
  `;

  if (existingRegistrations.length > 0) {
    throw new Error("Vous êtes déjà inscrit à ce tournoi");
  }

  const created = await database<Array<{ id: string }>>`
    insert into registrations (tournament_id, player_id, status)
    values (${tournamentId}, ${playerId}, 'pending')
    returning id
  `;

  if (!created[0]?.id) {
    throw new Error("Création inscription échouée.");
  }

  return created[0].id;
};

const getTournamentWhatsappLink = async (
  database: Sql,
  tournamentId: string
): Promise<string | null> => {
  const [tournament] = await database<
    Array<{ whatsapp_group_link: string | null }>
  >`
    select whatsapp_group_link
    from tournaments
    where id = ${tournamentId}
    limit 1
  `;

  return tournament?.whatsapp_group_link ?? null;
};

const getHasAlreadyJoined = async (
  database: Sql,
  playerId: string,
  tournamentId: string
): Promise<boolean> => {
  const [player] = await database<
    Array<{ whatsapp_joined_tournaments: unknown }>
  >`
    select whatsapp_joined_tournaments
    from players
    where id = ${playerId}
    limit 1
  `;

  const joins = (player?.whatsapp_joined_tournaments as Array<{
    tournamentId: string;
  }>) || [];

  return joins.some((join) => join.tournamentId === tournamentId);
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

    const registrationId = await ensureRegistration(database, tournamentId, playerId);
    const whatsappGroupLink = await getTournamentWhatsappLink(database, tournamentId);
    const hasAlreadyJoined = await getHasAlreadyJoined(
      database,
      playerId,
      tournamentId
    );

    return {
      status: "ok",
      message:
        "✓ Inscription réussie ! Votre compte a été rattaché à ce tournoi. Votre demande est en attente de validation.",
      playerId,
      registrationId,
      tournamentId,
      whatsappGroupLink,
      hasAlreadyJoined,
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

  const registrationId = await ensureRegistration(database, tournamentId, playerId);
  const whatsappGroupLink = await getTournamentWhatsappLink(database, tournamentId);
  const hasAlreadyJoined = await getHasAlreadyJoined(database, playerId, tournamentId);

  return {
    status: "ok",
    message:
      "✓ Inscription réussie ! Votre demande est en attente de validation par l'administrateur.",
    playerId,
    registrationId,
    tournamentId,
    whatsappGroupLink,
    hasAlreadyJoined,
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

type AdminCreatePlayerResult =
  | {
      status: "ok";
      message: string;
      playerId: string;
      tournamentId: string;
    }
  | { status: "error"; message: string };

export async function createPlayerByAdminAction(
  _prevState: unknown,
  formData: FormData
): Promise<AdminCreatePlayerResult> {
  try {
    const adminToken = String(formData.get("adminToken") ?? "").trim();
    assertAdminToken(adminToken);

    const database = getDatabaseClient();
    const mode = String(formData.get("mode") ?? "new") as RegistrationMode;
    const tournamentId = String(formData.get("tournamentId") ?? "").trim();

    if (!tournamentId) {
      return { status: "error", message: "Tournoi introuvable." };
    }

    if (mode === "existing") {
      const playerId = String(formData.get("playerId") ?? "").trim();

      if (!playerId) {
        return { status: "error", message: "Joueur non trouvé." };
      }

      const [player] = await database<Array<{ id: string }>>`
        select id
        from players
        where id = ${playerId}
        limit 1
      `;

      if (!player?.id) {
        return { status: "error", message: "Joueur non trouvé." };
      }

      const existingRegistration = await database<Array<{ id: string }>>`
        select id
        from registrations
        where tournament_id = ${tournamentId} and player_id = ${playerId}
        limit 1
      `;

      if (existingRegistration.length > 0) {
        return { status: "error", message: "Ce joueur est déjà inscrit" };
      }

      const created = await database<Array<{ id: string }>>`
        insert into registrations (
          player_id,
          tournament_id,
          status,
          created_at,
          updated_at
        )
        values (${playerId}, ${tournamentId}, 'approved', now(), now())
        returning id
      `;

      if (!created[0]?.id) {
        return { status: "error", message: "Création inscription échouée." };
      }

      return {
        status: "ok",
        message: "Joueur créé et validé avec succès",
        playerId,
        tournamentId,
      };
    }

    const rawPhone = String(formData.get("phone") ?? "").trim();
    const phone = normalizePhone(rawPhone);

    if (!phone) {
      return {
        status: "error",
        message:
          "Format de téléphone invalide. Utilisez : 06 12 34 56 78 ou +33 6 12 34 56 78",
      };
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
        message: "Ce numéro existe déjà, utilisez le mode 'Joueur existant'",
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

    if (!firstName || !lastName || !level) {
      return { status: "error", message: "Champs requis manquants." };
    }

    if (isRanked && !ranking) {
      return { status: "error", message: "Classement requis." };
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

    const created = await database<Array<{ id: string }>>`
      insert into registrations (
        player_id,
        tournament_id,
        status,
        created_at,
        updated_at
      )
      values (${playerId}, ${tournamentId}, 'approved', now(), now())
      returning id
    `;

    if (!created[0]?.id) {
      return { status: "error", message: "Création inscription échouée." };
    }

    return {
      status: "ok",
      message: "Joueur créé et validé avec succès",
      playerId,
      tournamentId,
    };
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
    const updated = await database<Array<{ id: string; tournament_id: string }>>`
      update registrations
      set
        status = ${status},
        waitlist_added_at = case when ${status} = 'waitlist' then now() else null end
      where id = ${registrationId}
      returning id, tournament_id
    `;

    if (updated.length === 0) {
      return { status: "error", message: "Inscription introuvable." };
    }

    const tournamentId = updated[0]?.tournament_id;
    if (tournamentId) {
      revalidatePath(`/tournaments/${tournamentId}/admin`);
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
