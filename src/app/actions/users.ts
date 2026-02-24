"use server";

import { revalidatePath } from "next/cache";
import { assertAdminToken } from "@/lib/admin";
import { getDatabaseClient } from "@/lib/database";
import { uploadImage, deleteImage, validateImageFile } from "@/lib/storage-helpers";
import type { Player } from "@/lib/types";

type PlayerUpdateInput = Partial<
  Pick<
    Player,
    "first_name" | "last_name" | "email" | "phone" | "photo_url" | "status" | "admin_notes"
  >
>;

export async function getAllPlayersAction(
  adminToken: string,
  search?: string,
  status?: string,
  page = 1,
  limit = 10
): Promise<{
  players: Player[];
  total: number;
  page: number;
  totalPages: number;
}> {
  assertAdminToken(adminToken);
  const database = getDatabaseClient();

  const sanitizedPage = Number.isFinite(page) && page > 0 ? page : 1;
  const sanitizedLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;
  const offset = (sanitizedPage - 1) * sanitizedLimit;

  const filters: string[] = [];
  const values: Array<string | number> = [];

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    values.push(term);
    const searchIndex = values.length;
    filters.push(
      `(
        lower(first_name) LIKE lower($${searchIndex})
        OR lower(last_name) LIKE lower($${searchIndex})
        OR lower(email) LIKE lower($${searchIndex})
        OR phone LIKE $${searchIndex}
      )`
    );
  }

  if (status && status !== "all") {
    values.push(status);
    filters.push(`status = $${values.length}`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const countResult = await database.unsafe<{ total: number }[]>(
    `SELECT COUNT(*)::int AS total FROM players ${whereClause}`,
    values
  );
  const total = countResult[0]?.total ?? 0;

  const query = `
    SELECT *
    FROM players
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;
  const rows = await database.unsafe<Player[]>(query, [
    ...values,
    sanitizedLimit,
    offset,
  ]);

  return {
    players: rows,
    total,
    page: sanitizedPage,
    totalPages: Math.max(1, Math.ceil(total / sanitizedLimit)),
  };
}

export async function updatePlayerAction(
  playerId: string,
  data: PlayerUpdateInput,
  adminToken: string
): Promise<{ success: boolean; error?: string; player?: Player }> {
  try {
    assertAdminToken(adminToken);
    const database = getDatabaseClient();

    const existing = await database<{ id: string }[]>`
      SELECT id FROM players WHERE id = ${playerId}
    `;
    if (!existing[0]) {
      return { success: false, error: "Utilisateur non trouvé" };
    }

    if (data.email) {
      const duplicate = await database<{ id: string }[]>`
        SELECT id FROM players WHERE email = ${data.email} AND id <> ${playerId}
      `;
      if (duplicate.length > 0) {
        return { success: false, error: "Cet email est déjà utilisé" };
      }
    }

    const updates: string[] = [];
    const values: Array<string | null> = [];

    const pushUpdate = (column: string, value: string | null | undefined) => {
      if (value === undefined) return;
      values.push(value ?? null);
      updates.push(`${column} = $${values.length}`);
    };

    pushUpdate("first_name", data.first_name);
    pushUpdate("last_name", data.last_name);
    pushUpdate("email", data.email ?? null);
    pushUpdate("phone", data.phone ?? null);
    pushUpdate("photo_url", data.photo_url ?? null);
    pushUpdate("status", data.status);
    pushUpdate("admin_notes", data.admin_notes ?? null);

    if (updates.length === 0) {
      return { success: false, error: "Aucune modification" };
    }

    values.push(playerId);

    const query = `
      UPDATE players
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING *
    `;
    const result = await database.unsafe<Player[]>(query, values);

    revalidatePath("/admin/users");
    return { success: true, player: result[0] };
  } catch (error) {
    console.error("[updatePlayerAction]", error);
    return { success: false, error: "Erreur lors de la mise à jour" };
  }
}

export async function uploadPlayerPhotoAction(
  playerId: string,
  formData: FormData,
  adminToken: string
): Promise<{ success: boolean; error?: string; photoUrl?: string }> {
  try {
    assertAdminToken(adminToken);
    const file = formData.get("photo") as File | null;

    if (!file) {
      return { success: false, error: "Aucun fichier fourni" };
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const database = getDatabaseClient();
    const rows = await database<Array<{ photo_url: string | null }>>`
      SELECT photo_url FROM players WHERE id = ${playerId}
    `;
    const oldPhotoUrl = rows[0]?.photo_url ?? null;

    if (oldPhotoUrl) {
      await deleteImage(oldPhotoUrl);
    }

    const { url: photoUrl } = await uploadImage(file, "player-photos", playerId);

    await database`
      UPDATE players SET photo_url = ${photoUrl}, updated_at = NOW() WHERE id = ${playerId}
    `;

    revalidatePath("/admin/users");
    return { success: true, photoUrl };
  } catch (error) {
    console.error("[uploadPlayerPhotoAction]", error);
    return { success: false, error: "Erreur lors de l'upload de la photo" };
  }
}

export async function deletePlayerAction(
  playerId: string,
  adminToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    assertAdminToken(adminToken);
    const database = getDatabaseClient();

    const registrations = await database<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM registrations WHERE player_id = ${playerId}
    `;
    if ((registrations[0]?.count ?? 0) > 0) {
      return {
        success: false,
        error: "Impossible de supprimer un utilisateur avec des inscriptions actives",
      };
    }

    await database`DELETE FROM players WHERE id = ${playerId}`;
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("[deletePlayerAction]", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }
}
