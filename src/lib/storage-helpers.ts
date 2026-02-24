import { put, del } from "@vercel/blob";

export type StorageBucket = "home-photos" | "player-photos";

export async function uploadImage(
  file: File,
  bucket: StorageBucket,
  folder?: string
): Promise<{ url: string; path: string }> {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const fileExt = file.name.split(".").pop();
  const fileName = `${timestamp}-${randomStr}.${fileExt}`;
  const pathname = folder
    ? `${bucket}/${folder}/${fileName}`
    : `${bucket}/${fileName}`;

  const blob = await put(pathname, file, {
    access: "public",
    contentType: file.type,
  });

  return {
    url: blob.url,
    path: blob.pathname,
  };
}

export async function deleteImage(url: string): Promise<void> {
  if (!url || url.startsWith("/uploads/")) return;
  try {
    await del(url);
  } catch (error) {
    console.warn(`Failed to delete blob: ${url}`, error);
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
