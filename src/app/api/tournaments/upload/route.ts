import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { randomUUID } from "node:crypto";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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
  const previousUrl = String(formData.get("previousPath") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Format non supporté." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux." }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = buildFileName(slug, ext);
  const pathname = `tournaments/${filename}`;

  const blob = await put(pathname, file, { access: "public", contentType: file.type });

  if (previousUrl && !previousUrl.startsWith("/uploads/")) {
    try {
      await del(previousUrl);
    } catch {
      // ignore missing blob
    }
  }

  return NextResponse.json({ path: blob.url });
}
