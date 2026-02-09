"use server";

import { getDatabaseClient } from "@/lib/database";
import { assertAdminToken } from "@/lib/admin";
import type { RegistrationStatus } from "@/lib/types";
import type { Sql } from "postgres";
import { revalidatePath } from "next/cache";

type RegistrationResult =
  | { status: "ok"; message: string }
  | { status: "error"; message: string };

type TournamentIdentifier =
  | { id: string }
  | { slug: string };

const insertOrUpdatePlayer = async (
  database: Sql,
  {
    firstName,
    lastName,
    email,
    phone,
  }: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }
): Promise<string> => {
  let playerId: string | null = null;
  const existingPlayers = await database<Array<{ id: string }>>`
    select id
    from players
    where email = ${email}
    limit 1
  `;

  if (existingPlayers[0]?.id) {
    const updatedPlayers = await database<Array<{ id: string }>>`
      update players
      set
        first_name = ${firstName},
        last_name = ${lastName},
        phone = ${phone || null}
      where id = ${existingPlayers[0].id}
      returning id
    `;

    if (!updatedPlayers[0]?.id) {
      throw new Error("Mise à jour joueur échouée.");
    }

    playerId = updatedPlayers[0].id;
  } else {
    const createdPlayers = await database<Array<{ id: string }>>`
      insert into players (email, first_name, last_name, phone)
      values (${email}, ${firstName}, ${lastName}, ${phone || null})
      returning id
    `;

    if (!createdPlayers[0]?.id) {
      throw new Error("Création joueur échouée.");
    }

    playerId = createdPlayers[0].id;
  }

  return playerId;
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
    throw new Error("Vous êtes déjà inscrit pour ce tournoi.");
  }

  await database`
    insert into registrations (tournament_id, player_id, status)
    values (${tournamentId}, ${playerId}, 'pending')
  `;
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
    where slug = ${identifier.slug} and status = 'published'
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
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const phone = String(formData.get("phone") ?? "").trim();

    if (!firstName || !lastName || !email) {
      return { status: "error", message: "Champs requis manquants." };
    }

    const tournaments = await database<Array<{ id: string }>>`
      select id
      from tournaments
      where status = 'published'
      order by created_at desc
      limit 1
    `;

    const tournament = tournaments[0];

    if (!tournament?.id) {
      return {
        status: "error",
        message: "Aucun tournoi actif pour le moment.",
      };
    }

    const playerId = await insertOrUpdatePlayer(database, {
      firstName,
      lastName,
      email,
      phone,
    });

    await ensureRegistration(database, tournament.id, playerId);

    return {
      status: "ok",
      message: "Inscription reçue. Validation en cours.",
    };
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
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const phone = String(formData.get("phone") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();

    if (!firstName || !lastName || !email) {
      return { status: "error", message: "Champs requis manquants." };
    }

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

    const playerId = await insertOrUpdatePlayer(database, {
      firstName,
      lastName,
      email,
      phone,
    });

    await ensureRegistration(database, tournamentId, playerId);

    return {
      status: "ok",
      message: "Inscription reçue. Validation en cours.",
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
