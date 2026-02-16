"use server";

import { revalidatePath } from "next/cache";
import { assertAdminToken } from "@/lib/admin";
import { getDatabaseClient } from "@/lib/database";
import { generateEmptyPlayoffBracket } from "@/app/actions/playoff-actions";
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

const getValue = (formData: FormData, key: string) => {
  const direct = formData.get(key);
  if (direct !== null) return direct;

  for (const [entryKey, value] of Array.from(formData.entries())) {
    if (entryKey === key) return value;
    if (entryKey.endsWith(`_${key}`)) return value;
  }

  return null;
};

export async function upsertTournamentAction(
  formData: FormData
): Promise<{ ok: boolean; reason?: string }>
{
  const adminToken = String(getValue(formData, "adminToken") ?? "");
  assertAdminToken(adminToken);

  const database = getDatabaseClient();
  const tournamentId = String(getValue(formData, "tournamentId") ?? "");
  const name = String(getValue(formData, "name") ?? "").trim();
  const date = String(getValue(formData, "date") ?? "");
  const location = String(getValue(formData, "location") ?? "").trim();
  const description = String(getValue(formData, "description") ?? "").trim();
  const slug = String(getValue(formData, "slug") ?? "").trim();
  const status = String(getValue(formData, "status") ?? "draft") as TournamentStatus;
  const maxPlayers = Number(getValue(formData, "maxPlayers") ?? 0);
  const imagePath = String(getValue(formData, "imagePath") ?? "").trim();
  const price = getValue(formData, "price");
  const priceValue = price !== null && price !== "" ? Number(price) : null;
  const whatsappGroupLink = getValue(formData, "whatsapp_group_link");
  const whatsappLinkValue =
    whatsappGroupLink && String(whatsappGroupLink).trim() !== ""
      ? String(whatsappGroupLink).trim()
      : null;
  const pairingMode = String(
    getValue(formData, "pairingMode") ?? "balanced"
  ) as TournamentConfig["pairing_mode"];
  const poolsCount = Number(getValue(formData, "poolsCount") ?? 4);
  const playoffsEnabled = String(getValue(formData, "playoffsEnabled") ?? "true") === "true";
  const teamsQualified = Number(getValue(formData, "teamsQualified") ?? 8);
  const playoffsFormat = String(
    getValue(formData, "playoffsFormat") ?? "single_elim"
  ) as TournamentConfig["playoffs"]["format"];
  const hasThirdPlace = String(getValue(formData, "hasThirdPlace") ?? "false") === "true";

  console.info("[tournaments] upsert payload", {
    tournamentId,
    name,
    maxPlayers,
    poolsCount,
    teamsQualified,
    rawMaxPlayers: formData.get("maxPlayers"),
    rawPoolsCount: formData.get("poolsCount"),
    rawMaxPlayersPrefixed: formData.get("1_maxPlayers"),
    rawPoolsCountPrefixed: formData.get("1_poolsCount"),
  });

  if (!name || !date) {
    return { ok: false, reason: "missing_name_or_date" };
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
    const previous = await database<Array<{ config: TournamentConfig }>>`
      select config
      from tournaments
      where id = ${tournamentId}
      limit 1
    `;
    const wasPlayoffsEnabled = previous[0]?.config?.playoffs?.enabled ?? false;
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
        price = ${priceValue},
        whatsapp_group_link = ${whatsappLinkValue},
        config = ${database.json(config)}
      where id = ${tournamentId}
    `;
    const shouldGenerateBracket = !wasPlayoffsEnabled && config.playoffs.enabled;
    if (shouldGenerateBracket) {
      await generateEmptyPlayoffBracket(tournamentId);
    }
  } else {
    const created = await database<Array<{ id: string }>>`
      insert into tournaments (slug, name, date, location, description, status, max_players, image_path, price, whatsapp_group_link, config)
      values (
        ${slug || null},
        ${name},
        ${date},
        ${location || null},
        ${description || null},
        ${status},
        ${maxPlayers || null},
        ${imagePath || null},
        ${priceValue},
        ${whatsappLinkValue},
        ${database.json(config || DEFAULT_CONFIG)}
      )
      returning id
    `;
    const createdId = created[0]?.id;
    if (createdId && config.playoffs.enabled) {
      await generateEmptyPlayoffBracket(createdId);
    }
  }

  revalidatePath("/admin/inscriptions");
  return { ok: true };
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
