"use server";

import { revalidatePath } from "next/cache";
import { assertAdminToken } from "@/lib/admin";
import { getDatabaseClient } from "@/lib/database";

export async function upsertTournamentPhotoAction(
  formData: FormData
): Promise<void> {
  const adminToken = String(formData.get("adminToken") ?? "");
  assertAdminToken(adminToken);

  const database = getDatabaseClient();
  const photoId = String(formData.get("photoId") ?? "");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const url = String(formData.get("url") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  const featured = String(formData.get("featured") ?? "false") === "true";

  if (!url) {
    return;
  }

  if (photoId) {
    await database`
      update tournament_photos
      set
        tournament_id = ${tournamentId || null},
        url = ${url},
        caption = ${caption || null},
        featured = ${featured}
      where id = ${photoId}
    `;
  } else {
    await database`
      insert into tournament_photos (tournament_id, url, caption, featured)
      values (${tournamentId || null}, ${url}, ${caption || null}, ${featured})
    `;
  }

  revalidatePath("/admin/inscriptions");
}

export async function deleteTournamentPhotoAction(
  formData: FormData
): Promise<void> {
  const adminToken = String(formData.get("adminToken") ?? "");
  const photoId = String(formData.get("photoId") ?? "");
  assertAdminToken(adminToken);

  if (!photoId) {
    return;
  }

  const database = getDatabaseClient();
  await database`
    delete from tournament_photos
    where id = ${photoId}
  `;

  revalidatePath("/admin/inscriptions");
}
