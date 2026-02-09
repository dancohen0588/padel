"use server";

import { revalidatePath } from "next/cache";
import { assertAdminToken } from "@/lib/admin";
import { getDatabaseClient } from "@/lib/database";
import type { TournamentConfig, TournamentStatus } from "@/lib/types";

const DEFAULT_CONFIG: TournamentConfig = {
  pairing_mode: "balanced",
  pools_count: 4,
  playoffs: {
    enabled: true,
    teams_qualified: 8,
    format: "single_elim",
    has_third_place: false,
  },
};

export async function upsertTournamentAction(formData: FormData): Promise<void> {
  const adminToken = String(formData.get("adminToken") ?? "");
  assertAdminToken(adminToken);

  const database = getDatabaseClient();
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const location = String(formData.get("location") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const status = String(formData.get("status") ?? "draft") as TournamentStatus;
  const maxPlayers = Number(formData.get("maxPlayers") ?? 0);
  const imagePath = String(formData.get("imagePath") ?? "").trim();
  const pairingMode = String(formData.get("pairingMode") ?? "balanced") as TournamentConfig["pairing_mode"];
  const poolsCount = Number(formData.get("poolsCount") ?? 4);
  const playoffsEnabled = String(formData.get("playoffsEnabled") ?? "true") === "true";
  const teamsQualified = Number(formData.get("teamsQualified") ?? 8);
  const playoffsFormat = String(formData.get("playoffsFormat") ?? "single_elim") as TournamentConfig["playoffs"]["format"];
  const hasThirdPlace = String(formData.get("hasThirdPlace") ?? "false") === "true";

  if (!name || !date) {
    return;
  }

  const config: TournamentConfig = {
    pairing_mode: pairingMode,
    pools_count: Number.isFinite(poolsCount) && poolsCount > 0 ? poolsCount : 4,
    playoffs: {
      enabled: playoffsEnabled,
      teams_qualified: Number.isFinite(teamsQualified) && teamsQualified > 0 ? teamsQualified : 8,
      format: playoffsFormat,
      has_third_place: hasThirdPlace,
    },
  };

  if (tournamentId) {
    await database`
      update tournaments
      set
        slug = ${slug || null},
        name = ${name},
        date = ${date},
        location = ${location || null},
        description = ${description || null},
        status = ${status},
        max_players = ${maxPlayers || null},
        image_path = ${imagePath || null},
        config = ${JSON.stringify(config)}::jsonb
      where id = ${tournamentId}
    `;
  } else {
    await database`
      insert into tournaments (slug, name, date, location, description, status, max_players, image_path, config)
      values (
        ${slug || null},
        ${name},
        ${date},
        ${location || null},
        ${description || null},
        ${status},
        ${maxPlayers || null},
        ${imagePath || null},
        ${JSON.stringify(config || DEFAULT_CONFIG)}::jsonb
      )
    `;
  }

  revalidatePath("/admin/inscriptions");
}

export async function deleteTournamentAction(formData: FormData): Promise<void> {
  const adminToken = String(formData.get("adminToken") ?? "");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  assertAdminToken(adminToken);

  if (!tournamentId) {
    return;
  }

  const database = getDatabaseClient();
  await database`
    delete from tournaments
    where id = ${tournamentId}
  `;

  revalidatePath("/admin/inscriptions");
}
