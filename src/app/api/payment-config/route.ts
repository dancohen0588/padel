import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/database";
import { assertAdminToken } from "@/lib/admin";
import type { PaymentConfig } from "@/lib/types";

type PaymentConfigPayload = {
  paymentConfig?: PaymentConfig;
};

const GLOBAL_PAYMENT_CONFIG_ID = "00000000-0000-0000-0000-000000000001";

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    console.info("[payment-config] request", {
      hasToken: Boolean(token),
      scope: "global",
    });
    assertAdminToken(token);

    const body = (await request.json()) as PaymentConfigPayload;
    const rawPaymentConfig = body?.paymentConfig as unknown;
    const parsedPaymentConfig =
      typeof rawPaymentConfig === "string"
        ? (JSON.parse(rawPaymentConfig) as PaymentConfig)
        : (rawPaymentConfig as PaymentConfig | undefined);
    const payloadSize = JSON.stringify(parsedPaymentConfig ?? {}).length;
    console.info("[payment-config] payload", {
      hasPaymentConfig: Boolean(parsedPaymentConfig),
      payloadType: typeof rawPaymentConfig,
      payloadSize,
      enabled: parsedPaymentConfig?.enabled,
      methods: parsedPaymentConfig?.methods
        ? Object.fromEntries(
            Object.entries(parsedPaymentConfig.methods).map(([key, value]) => [
              key,
              value.enabled,
            ])
          )
        : null,
    });
    if (!parsedPaymentConfig) {
      return NextResponse.json(
        { success: false, error: "Configuration paiement manquante." },
        { status: 400 }
      );
    }

    const database = getDatabaseClient();
    const payload = JSON.stringify(parsedPaymentConfig);
    const updated = await database`
      update payment_config
      set config = ${payload}::jsonb,
          updated_at = now()
      where id = ${GLOBAL_PAYMENT_CONFIG_ID}
      returning id
    `;
    console.info("[payment-config] update", {
      updatedCount: updated.length,
    });

    if (updated.length === 0) {
      const inserted = await database`
        insert into payment_config (id, config)
        values (${GLOBAL_PAYMENT_CONFIG_ID}, ${payload}::jsonb)
        on conflict (id)
        do update set config = excluded.config,
                      updated_at = now()
        returning id
      `;
      console.info("[payment-config] upsert", {
        insertedCount: inserted.length,
      });
    }

    revalidatePath("/admin/inscriptions");
    revalidatePath("/inscription");
    console.info("[payment-config] revalidated", {
      paths: ["/admin/inscriptions", "/inscription"],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[payment-config] error", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      error,
    });
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json(
      { success: false, error: "Erreur serveur." },
      { status }
    );
  }
}
