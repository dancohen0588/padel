"use server";

import { revalidatePath } from "next/cache";
import { getDatabaseClient } from "@/lib/database";
import { assertAdminToken } from "@/lib/admin";
import type { PaymentMethodKey } from "@/lib/types";

export async function updatePaymentStatusAction(formData: FormData) {
  const database = getDatabaseClient();
  const registrationId = formData.get("registrationId") as string;
  const paymentStatus = formData.get("paymentStatus") === "true";
  const paymentMethod = formData.get("paymentMethod") as PaymentMethodKey | "";
  const adminToken = formData.get("adminToken") as string;

  if (!registrationId) {
    throw new Error("Missing registration ID");
  }

  try {
    assertAdminToken(adminToken);
  } catch {
    throw new Error("Invalid admin token");
  }

  if (paymentStatus) {
    await database`
      update registrations
      set
        payment_status = true,
        payment_method = ${paymentMethod || null},
        payment_date = now()
      where id = ${registrationId}
    `;
  } else {
    await database`
      update registrations
      set
        payment_status = false,
        payment_method = null,
        payment_date = null
      where id = ${registrationId}
    `;
  }

  const registration = await database<Array<{ tournament_id: string }>>`
    select tournament_id
    from registrations
    where id = ${registrationId}
  `;

  if (registration[0]) {
    revalidatePath(`/tournaments/${registration[0].tournament_id}/admin`);
  }

  return { success: true };
}

export async function updatePaymentMethodAction(formData: FormData) {
  const database = getDatabaseClient();
  const registrationId = formData.get("registrationId") as string;
  const paymentMethod = formData.get("paymentMethod") as PaymentMethodKey;
  const adminToken = formData.get("adminToken") as string;

  if (!registrationId || !paymentMethod) {
    throw new Error("Missing required fields");
  }

  try {
    assertAdminToken(adminToken);
  } catch {
    throw new Error("Invalid admin token");
  }

  await database`
    update registrations
    set payment_method = ${paymentMethod}
    where id = ${registrationId}
  `;

  const registration = await database<Array<{ tournament_id: string }>>`
    select tournament_id
    from registrations
    where id = ${registrationId}
  `;

  if (registration[0]) {
    revalidatePath(`/tournaments/${registration[0].tournament_id}/admin`);
  }

  return { success: true };
}
