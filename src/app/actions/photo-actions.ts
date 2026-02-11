"use server";

import { revalidatePath } from "next/cache";
import { assertAdminToken } from "@/lib/admin";
import { getDatabaseClient } from "@/lib/database";
import { deleteImage, uploadImage, validateImageFile } from "@/lib/storage-helpers";

export async function updateHomeCoverPhoto(formData: FormData) {
  const adminToken = String(formData.get("adminToken") ?? "");
  assertAdminToken(adminToken);

  const file = formData.get("cover_photo") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Aucun fichier fourni" };
  }

  const validation = validateImageFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const database = getDatabaseClient();
  const [config] = await database<{
    cover_photo_path: string | null;
  }[]>`select cover_photo_path from home_config where id = ${
    "00000000-0000-0000-0000-000000000001"
  }`;

  try {
    if (config?.cover_photo_path) {
      await deleteImage(config.cover_photo_path, "home-photos");
    }

    const { url, path } = await uploadImage(file, "home-photos", "cover");

    await database`
      update home_config
      set cover_photo_url = ${url},
          cover_photo_path = ${path},
          updated_at = now()
      where id = ${"00000000-0000-0000-0000-000000000001"}
    `;

    revalidatePath("/");
    revalidatePath("/admin/inscriptions");
    return { success: true, url };
  } catch (error) {
    console.error("Error updating cover photo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de l'upload",
    };
  }
}

export async function addGalleryPhoto(formData: FormData) {
  const adminToken = String(formData.get("adminToken") ?? "");
  assertAdminToken(adminToken);

  const file = formData.get("gallery_photo") as File | null;
  const caption = String(formData.get("caption") ?? "").trim();

  if (!file || file.size === 0) {
    return { success: false, error: "Aucun fichier fourni" };
  }

  const validation = validateImageFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const database = getDatabaseClient();
    const [maxOrderRow] = await database<{ display_order: number }[]>`
      select display_order
      from home_gallery
      order by display_order desc
      limit 1
    `;

    const nextOrder = (maxOrderRow?.display_order ?? -1) + 1;
    const { url, path } = await uploadImage(file, "home-photos", "gallery");

    await database`
      insert into home_gallery (photo_url, photo_path, caption, display_order, is_active)
      values (${url}, ${path}, ${caption || null}, ${nextOrder}, true)
    `;

    revalidatePath("/");
    revalidatePath("/admin/inscriptions");
    return { success: true, url };
  } catch (error) {
    console.error("Error adding gallery photo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de l'upload",
    };
  }
}

export async function deleteGalleryPhoto(formData: FormData) {
  const adminToken = String(formData.get("adminToken") ?? "");
  const photoId = String(formData.get("photoId") ?? "");
  assertAdminToken(adminToken);

  if (!photoId) {
    return { success: false, error: "Photo non trouvée" };
  }

  try {
    const database = getDatabaseClient();
    const [photo] = await database<{ photo_path: string }[]>`
      select photo_path
      from home_gallery
      where id = ${photoId}
    `;

    if (!photo) {
      return { success: false, error: "Photo non trouvée" };
    }

    await deleteImage(photo.photo_path, "home-photos");

    await database`
      delete from home_gallery
      where id = ${photoId}
    `;

    revalidatePath("/");
    revalidatePath("/admin/inscriptions");
    return { success: true };
  } catch (error) {
    console.error("Error deleting gallery photo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la suppression",
    };
  }
}

export async function reorderGalleryPhotos(formData: FormData) {
  const adminToken = String(formData.get("adminToken") ?? "");
  assertAdminToken(adminToken);

  const ids = String(formData.get("photoIds") ?? "");
  const photoIds = ids.split(",").filter(Boolean);

  if (!photoIds.length) {
    return { success: false, error: "Aucun ordre fourni" };
  }

  try {
    const database = getDatabaseClient();
    await Promise.all(
      photoIds.map((id, index) =>
        database`
          update home_gallery
          set display_order = ${index}
          where id = ${id}
        `
      )
    );

    revalidatePath("/");
    revalidatePath("/admin/inscriptions");
    return { success: true };
  } catch (error) {
    console.error("Error reordering photos:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors du réordonnancement",
    };
  }
}

export async function updatePlayerPhoto(userId: string, formData: FormData) {
  const file = formData.get("player_photo") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Aucun fichier fourni" };
  }

  const validation = validateImageFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const database = getDatabaseClient();
    const [player] = await database<{ photo_path: string | null }[]>`
      select photo_path
      from players
      where id = ${userId}
    `;

    if (player?.photo_path) {
      await deleteImage(player.photo_path, "player-photos");
    }

    const { url, path } = await uploadImage(file, "player-photos", userId);
    await database`
      update players
      set photo_url = ${url},
          photo_path = ${path}
      where id = ${userId}
    `;

    revalidatePath("/");
    revalidatePath("/inscription");
    return { success: true, url };
  } catch (error) {
    console.error("Error updating player photo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de l'upload",
    };
  }
}
