import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { randomUUID } from "node:crypto";

const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const buildFileName = (slug: string, ext: string) => {
  const safeSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${safeSlug || "tournoi"}-${randomUUID()}.${ext}`;
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const slug = String(formData.get("slug") ?? "tournoi");
  const previousUrl = String(formData.get("previousUrl") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Format non supporté. Utilisez PDF, JPG, PNG ou WebP." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (20 Mo max)." }, { status: 400 });
  }

  const filename = buildFileName(slug, ext);
  const blob = await put(`tournaments/reglement/${filename}`, file, {
    access: "public",
    contentType: file.type,
  });

  if (previousUrl && !previousUrl.startsWith("/uploads/")) {
    try {
      await del(previousUrl);
    } catch {
      // ignore missing blob
    }
  }

  return NextResponse.json({ url: blob.url });
}
