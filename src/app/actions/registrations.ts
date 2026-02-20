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

type StatusUpdateResult =
  | { status: "ok"; message: string }
  | { status: "error"; message: string };

type PairRegistrationSuccess = {
  status: "ok";
  message: string;
  player1Id: string;
  player2Id: string;
  tournamentId: string;
  whatsappGroupLink: string | null;
  hasAlreadyJoined: boolean;
};

type PairRegistrationResult =
  | PairRegistrationSuccess
  | { status: "error"; message: string };

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
  const pairWith = String(formData.get("pairWith") ?? "").trim() || null;

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

    if (pairWith) {
      await database`
        update players
        set pair_with = ${pairWith}
        where id = ${playerId}
      `;
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

  if (pairWith) {
    await database`
      update players
      set pair_with = ${pairWith}
      where id = ${playerId}
    `;
  }

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

export async function registerPairAction(
  _prevState: PairRegistrationResult | null,
  formData: FormData
): Promise<PairRegistrationResult> {
  try {
    const database = getDatabaseClient();
    const tournamentId = String(formData.get("tournamentId") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();

    console.info("[db-debug] registerPairAction", {
      tournamentId,
      slug,
    });

    if (!tournamentId) {
      return { status: "error", message: "Tournoi introuvable." };
    }

    const player1Mode = String(formData.get("player1Mode") ?? "new") as RegistrationMode;
    const player2Mode = String(formData.get("player2Mode") ?? "new") as RegistrationMode;

    const pairResult = await database.begin(async (txn) => {
      const transaction = txn as unknown as Sql;
      const resolvePlayer = async (prefix: "player1" | "player2") => {
        const mode = prefix === "player1" ? player1Mode : player2Mode;
        const rawPhone = String(formData.get(`${prefix}Phone`) ?? "").trim();
        const phone = normalizePhone(rawPhone);

        if (!phone) {
          throw new Error(
            prefix === "player1"
              ? "Le numéro de téléphone du Joueur 1 est invalide."
              : "Le numéro de téléphone du Joueur 2 est invalide."
          );
        }

        if (mode === "existing") {
          const playerId = String(formData.get(`${prefix}PlayerId`) ?? "").trim();
          if (!playerId) {
            throw new Error(
              prefix === "player1" ? "Joueur 1 introuvable." : "Joueur 2 introuvable."
            );
          }

          const players: Array<{ id: string; phone: string | null; first_name: string; last_name: string }> = await (transaction as unknown as Sql)`
            select id, phone, first_name, last_name
            from players
            where id = ${playerId}
            limit 1
          `;
          const [player] = players;

          if (!player?.id || normalizePhone(player.phone ?? "") !== phone) {
            throw new Error(
              prefix === "player1" ? "Joueur 1 introuvable." : "Joueur 2 introuvable."
            );
          }

          return {
            id: player.id,
            firstName: player.first_name,
            lastName: player.last_name,
            phone,
          };
        }

        const firstName = String(formData.get(`${prefix}FirstName`) ?? "").trim();
        const lastName = String(formData.get(`${prefix}LastName`) ?? "").trim();
        const email = String(formData.get(`${prefix}Email`) ?? "").trim() || null;
        const level = String(formData.get(`${prefix}Level`) ?? "").trim();
        const isRankedValue = String(formData.get(`${prefix}IsRanked`) ?? "non");
        const isRanked = isRankedValue === "oui";
        const ranking = isRanked
          ? String(formData.get(`${prefix}Ranking`) ?? "").trim() || null
          : null;
        const playPreference = String(formData.get(`${prefix}PlayPreference`) ?? "aucune").trim();

        if (!firstName || !lastName || !level) {
          throw new Error(
            prefix === "player1"
              ? "Veuillez remplir tous les champs obligatoires pour le Joueur 1."
              : "Veuillez remplir tous les champs obligatoires pour le Joueur 2."
          );
        }

        const existingPlayers: Array<{ id: string }> = await (transaction as unknown as Sql)`
          select id
          from players
          where CASE
            WHEN phone ~ '^\\+33' THEN '0' || regexp_replace(substring(phone from 4), '[^0-9]', '', 'g')
            ELSE regexp_replace(phone, '[^0-9]', '', 'g')
          END = ${phone.replace(/^\+33/, "0").replace(/\D/g, "")}
          limit 1
        `;

        if (existingPlayers[0]?.id) {
          throw new Error(
            prefix === "player1"
              ? "Le numéro de téléphone du Joueur 1 est déjà utilisé. Utilisez le mode 'joueur existant'."
              : "Le numéro de téléphone du Joueur 2 est déjà utilisé. Utilisez le mode 'joueur existant'."
          );
        }

        const playerId = await createPlayer(transaction as unknown as Sql, {
          firstName,
          lastName,
          email,
          phone,
          level,
          isRanked,
          ranking,
          playPreference,
        });

        return {
          id: playerId,
          firstName,
          lastName,
          phone,
        };
      };

      const player1 = await resolvePlayer("player1");
      const player2 = await resolvePlayer("player2");

      if (player1.id === player2.id) {
        throw new Error("Vous ne pouvez pas vous inscrire deux fois avec le même compte.");
      }

      const player1FullName = `${player1.firstName} ${player1.lastName}`.trim();
      const player2FullName = `${player2.firstName} ${player2.lastName}`.trim();

      await transaction`
        update players
        set pair_with = ${player2FullName}
        where id = ${player1.id}
      `;

      await transaction`
        update players
        set pair_with = ${player1FullName}
        where id = ${player2.id}
      `;

      await ensureRegistration(transaction as unknown as Sql, tournamentId, player1.id);
      await ensureRegistration(transaction as unknown as Sql, tournamentId, player2.id);

      const whatsappGroupLink = await getTournamentWhatsappLink(transaction as unknown as Sql, tournamentId);
      const hasAlreadyJoined = await getHasAlreadyJoined(transaction as unknown as Sql, player1.id, tournamentId);

      return {
        status: "ok" as const,
        message: `Inscription validée pour ${player1FullName} et ${player2FullName} !`,
        player1Id: player1.id,
        player2Id: player2.id,
        tournamentId,
        whatsappGroupLink,
        hasAlreadyJoined,
      };
    });

    const player1Photo = formData.get("player1_photo") as File | null;
    if (player1Photo && player1Photo.size > 0) {
      const photoData = new FormData();
      photoData.set("player_photo", player1Photo);
      await updatePlayerPhoto(pairResult.player1Id, photoData);
    }

    const player2Photo = formData.get("player2_photo") as File | null;
    if (player2Photo && player2Photo.size > 0) {
      const photoData = new FormData();
      photoData.set("player_photo", player2Photo);
      await updatePlayerPhoto(pairResult.player2Id, photoData);
    }

    return pairResult;
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

    const registrationColumns = await database<Array<{ column_name: string }>>`
      select column_name
      from information_schema.columns
      where table_schema = 'public' and table_name = 'registrations'
      order by ordinal_position
    `;

    console.log("[createPlayerByAdminAction] context", {
      mode,
      tournamentId,
      registrationColumns: registrationColumns.map((column) => column.column_name),
    });

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
          status
        )
        values (${playerId}, ${tournamentId}, 'approved')
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
        status
      )
      values (${playerId}, ${tournamentId}, 'approved')
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
): Promise<StatusUpdateResult> {
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
