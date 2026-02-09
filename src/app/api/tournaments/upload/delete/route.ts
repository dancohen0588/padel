import { NextResponse } from "next/server";
import { stat, unlink } from "node:fs/promises";
import path from "node:path";

const safeRemove = async (filePath: string | null) => {
  if (!filePath) return;
  try {
    await stat(filePath);
    await unlink(filePath);
  } catch {
    // ignore missing file
  }
};

export async function POST(request: Request) {
  const body = (await request.json()) as { path?: string };
  const filePath = body?.path ?? "";

  if (!filePath || !filePath.startsWith("/uploads/")) {
    return NextResponse.json({ error: "Chemin invalide." }, { status: 400 });
  }

  const absolutePath = path.join(process.cwd(), "public", filePath);
  await safeRemove(absolutePath);

  return NextResponse.json({ ok: true });
}
