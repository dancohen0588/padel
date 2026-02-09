import { NextResponse } from "next/server";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const ensureUploadsDir = async () => {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  return uploadsDir;
};

const safeRemove = async (filePath: string | null) => {
  if (!filePath) return;
  try {
    await stat(filePath);
    await unlink(filePath);
  } catch {
    // ignore missing file
  }
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
  const previousPath = String(formData.get("previousPath") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Format non supporté." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const uploadsDir = await ensureUploadsDir();
  const filename = buildFileName(slug, ext);
  const absolutePath = path.join(uploadsDir, filename);

  await writeFile(absolutePath, buffer);

  if (previousPath.startsWith("/uploads/")) {
    const previousAbsolute = path.join(process.cwd(), "public", previousPath);
    await safeRemove(previousAbsolute);
  }

  return NextResponse.json({ path: `/uploads/${filename}` });
}
