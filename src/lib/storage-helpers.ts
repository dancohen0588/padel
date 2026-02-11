import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export type StorageBucket = "home-photos" | "player-photos";

/**
 * Retourne le chemin du dossier pour un bucket donné
 */
function getBucketPath(bucket: StorageBucket): string {
  const baseDir = path.join(process.cwd(), "public", "uploads");
  const bucketDir = path.join(baseDir, bucket);
  return bucketDir;
}

/**
 * S'assure que le dossier existe
 */
async function ensureDirExists(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

export async function uploadImage(
  file: File,
  bucket: StorageBucket,
  folder?: string
): Promise<{ url: string; path: string }> {
  try {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileExt = file.name.split(".").pop();
    const fileName = `${timestamp}-${randomStr}.${fileExt}`;

    const bucketPath = getBucketPath(bucket);
    const folderPath = folder ? path.join(bucketPath, folder) : bucketPath;
    await ensureDirExists(folderPath);

    const filePath = path.join(folderPath, fileName);
    const relativePath = folder ? `${folder}/${fileName}` : fileName;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${bucket}/${relativePath}`;

    return {
      url: publicUrl,
      path: relativePath,
    };
  } catch (error) {
    console.error("Error uploading image:", error);
    throw new Error(
      `Failed to upload image: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function deleteImage(
  relativePath: string,
  bucket: StorageBucket
): Promise<void> {
  try {
    const bucketPath = getBucketPath(bucket);
    const fullPath = path.join(bucketPath, relativePath);

    if (existsSync(fullPath)) {
      await unlink(fullPath);
      console.log(`Successfully deleted image: ${relativePath}`);
    } else {
      console.warn(`File not found, skipping deletion: ${relativePath}`);
    }
  } catch (error) {
    console.error("Error deleting image:", error);
    console.warn(`Failed to delete image: ${relativePath}`);
  }
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024;
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Format non supporté. Utilisez JPG, PNG ou WebP.",
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: "L'image est trop volumineuse. Maximum 5MB.",
    };
  }

  return { valid: true };
}
