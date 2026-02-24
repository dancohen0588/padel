import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { randomUUID } from "node:crypto";

const MAX_SIZE = 20 * 1024 * 1024;

const buildFileName = (slug: string) => {
  const safeSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${safeSlug || "tournoi"}-${randomUUID()}.pdf`;
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const slug = String(formData.get("slug") ?? "tournoi");
  const previousUrl = String(formData.get("previousUrl") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Seuls les fichiers PDF sont acceptés." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (20 Mo max)." }, { status: 400 });
  }

  const filename = buildFileName(slug);
  const blob = await put(`tournaments/pdf/${filename}`, file, {
    access: "public",
    contentType: "application/pdf",
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
