import { NextResponse } from "next/server";
import { del } from "@vercel/blob";

export async function POST(request: Request) {
  const body = (await request.json()) as { path?: string };
  const url = body?.path ?? "";

  if (!url || url.startsWith("/uploads/")) {
    return NextResponse.json({ ok: true });
  }

  try {
    await del(url);
  } catch {
    // ignore missing blob
  }

  return NextResponse.json({ ok: true });
}
