"use server";

import { cookies } from "next/headers";
import { assertAdminToken } from "@/lib/admin";

const COOKIE_NAME = "admin_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

export async function adminLoginAction(
  token: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    assertAdminToken(token);
    cookies().set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Mot de passe incorrect." };
  }
}

export async function adminLogoutAction(): Promise<void> {
  cookies().delete(COOKIE_NAME);
}

export async function getAdminTokenFromCookie(): Promise<string> {
  return cookies().get(COOKIE_NAME)?.value ?? "";
}
