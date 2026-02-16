import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/database";
import { assertAdminToken } from "@/lib/admin";
import type { PaymentConfig } from "@/lib/types";

type RouteParams = {
  params: {
    id: string;
  };
};

type PaymentConfigPayload = {
  paymentConfig?: PaymentConfig;
};

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    console.info("[payment-config] request", {
      tournamentId: params.id,
      hasToken: Boolean(token),
    });
    assertAdminToken(token);

    const tournamentId = params.id;
    if (!tournamentId) {
      return NextResponse.json(
        { success: false, error: "Tournoi introuvable." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as PaymentConfigPayload;
    console.info("[payment-config] payload", {
      hasPaymentConfig: Boolean(body?.paymentConfig),
      enabled: body?.paymentConfig?.enabled,
      methods: body?.paymentConfig?.methods
        ? Object.fromEntries(
            Object.entries(body.paymentConfig.methods).map(([key, value]) => [
              key,
              value.enabled,
            ])
          )
        : null,
    });
    if (!body?.paymentConfig) {
      return NextResponse.json(
        { success: false, error: "Configuration paiement manquante." },
        { status: 400 }
      );
    }

    const database = getDatabaseClient();
    const payload = JSON.stringify(body.paymentConfig);
    await database`
      update tournaments
      set payment_config = ${payload}::jsonb
      where id = ${tournamentId}
    `;

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
