"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PaymentConfig } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { GradientButton } from "@/components/ui/gradient-button";

type PaymentsTabProps = {
  adminToken: string;
  paymentConfig: PaymentConfig;
};

const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  enabled: false,
  methods: {
    bank: {
      enabled: false,
      iban: null,
      bic: null,
    },
    lydia: {
      enabled: false,
      identifier: null,
    },
    revolut: {
      enabled: false,
      link: null,
      tag: null,
    },
    wero: {
      enabled: false,
      identifier: null,
    },
    cash: {
      enabled: false,
    },
  },
  confirmationEmail: null,
  paymentDeadlineHours: 48,
};

const normalizePaymentConfig = (value: unknown): PaymentConfig => {
  const base = DEFAULT_PAYMENT_CONFIG;
  if (!value) return base;

  let candidate: Partial<PaymentConfig> | null = null;
  if (typeof value === "string") {
    try {
      candidate = JSON.parse(value) as PaymentConfig;
    } catch {
      return base;
    }
  } else if (typeof value === "object") {
    candidate = value as PaymentConfig;
  }

  if (!candidate) return base;

  const methods = (candidate.methods ?? {}) as Partial<PaymentConfig["methods"]>;

  return {
    enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : base.enabled,
    methods: {
      bank: { ...base.methods.bank, ...methods.bank },
      lydia: { ...base.methods.lydia, ...methods.lydia },
      revolut: { ...base.methods.revolut, ...methods.revolut },
      wero: { ...base.methods.wero, ...methods.wero },
      cash: { ...base.methods.cash, ...methods.cash },
    },
    confirmationEmail:
      typeof candidate.confirmationEmail === "string" || candidate.confirmationEmail === null
        ? candidate.confirmationEmail
        : base.confirmationEmail,
    paymentDeadlineHours:
      typeof candidate.paymentDeadlineHours === "number"
        ? candidate.paymentDeadlineHours
        : base.paymentDeadlineHours,
  };
};

export function PaymentsTab({
  adminToken,
  paymentConfig,
}: PaymentsTabProps) {
  const [config, setConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!paymentConfig) {
      setConfig(DEFAULT_PAYMENT_CONFIG);
      return;
    }
    setConfig(normalizePaymentConfig(paymentConfig as unknown));
    setSaveError(null);
  }, [paymentConfig]);

  const updateMethod = <K extends keyof PaymentConfig["methods"]>(
    key: K,
    updates: Partial<PaymentConfig["methods"][K]>
  ) => {
    setConfig((prev) => ({
      ...prev,
      methods: {
        ...prev.methods,
        [key]: {
          ...prev.methods[key],
          ...updates,
        },
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const payloadConfig = normalizePaymentConfig(config as unknown);
      const payloadSize = JSON.stringify(payloadConfig).length;
      if (payloadSize > 20000) {
        throw new Error("Configuration paiement trop volumineuse.");
      }
      console.info("[payments] save start", {
        hasAdminToken: Boolean(adminToken),
        enabled: payloadConfig.enabled,
        methods: Object.fromEntries(
          Object.entries(payloadConfig.methods).map(([key, value]) => [key, value.enabled])
        ),
        scope: "global",
        payloadType: typeof payloadConfig,
        payloadSize,
      });
      const response = await fetch(
        `/api/payment-config?token=${adminToken}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ paymentConfig: payloadConfig }),
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        console.warn("[payments] save failed", {
          status: response.status,
          payload,
        });
        throw new Error(payload?.error || "Mise à jour impossible.");
      }

      console.info("[payments] save success");
      router.refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Mise à jour impossible.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="rounded-2xl border border-white/10 bg-white/5 text-white shadow-card">
        <CardHeader className="space-y-1">
          <p className="text-sm font-semibold text-white">Paiements globaux</p>
          <p className="text-xs text-white/60">
            Activez les moyens de paiement et les informations à afficher pour tous les tournois.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Paiements activés</p>
              <p className="text-xs text-white/60">
                Active la section paiement dans le formulaire d'inscription
              </p>
            </div>
            <Switch
              className="switch-root"
              checked={config.enabled}
              onCheckedChange={(checked) =>
                setConfig((prev) => ({
                  ...prev,
                  enabled: checked,
                }))
              }
            />
          </div>

          <Separator className="bg-white/10" />

          <div className="space-y-3">
            <Label className="text-xs uppercase text-white/50">
              Moyens de paiement
            </Label>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Virement bancaire</p>
                  <p className="text-xs text-white/60">IBAN + BIC</p>
                </div>
                <Switch
                  className="switch-root"
                  checked={config.methods.bank.enabled}
                  onCheckedChange={(checked) => updateMethod("bank", { enabled: checked })}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-white/70">IBAN</Label>
                  <Input
                    value={config.methods.bank.iban ?? ""}
                    onChange={(event) => updateMethod("bank", { iban: event.target.value || null })}
                    placeholder="FR76 ..."
                    className="input-field"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">BIC</Label>
                  <Input
                    value={config.methods.bank.bic ?? ""}
                    onChange={(event) => updateMethod("bank", { bic: event.target.value || null })}
                    placeholder="AGRIFRPP"
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Lydia</p>
                  <p className="text-xs text-white/60">Identifiant Lydia</p>
                </div>
                <Switch
                  className="switch-root"
                  checked={config.methods.lydia.enabled}
                  onCheckedChange={(checked) => updateMethod("lydia", { enabled: checked })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Identifiant</Label>
                <Input
                  value={config.methods.lydia.identifier ?? ""}
                  onChange={(event) =>
                    updateMethod("lydia", { identifier: event.target.value || null })
                  }
                  placeholder="@votreclub"
                  className="input-field"
                />
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Revolut</p>
                  <p className="text-xs text-white/60">Lien ou tag</p>
                </div>
                <Switch
                  className="switch-root"
                  checked={config.methods.revolut.enabled}
                  onCheckedChange={(checked) => updateMethod("revolut", { enabled: checked })}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-white/70">Lien</Label>
                  <Input
                    value={config.methods.revolut.link ?? ""}
                    onChange={(event) => updateMethod("revolut", { link: event.target.value || null })}
                    placeholder="https://revolut.me/..."
                    className="input-field"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Tag</Label>
                  <Input
                    value={config.methods.revolut.tag ?? ""}
                    onChange={(event) => updateMethod("revolut", { tag: event.target.value || null })}
                    placeholder="@club"
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Wero</p>
                  <p className="text-xs text-white/60">Identifiant Wero</p>
                </div>
                <Switch
                  className="switch-root"
                  checked={config.methods.wero.enabled}
                  onCheckedChange={(checked) => updateMethod("wero", { enabled: checked })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Identifiant</Label>
                <Input
                  value={config.methods.wero.identifier ?? ""}
                  onChange={(event) => updateMethod("wero", { identifier: event.target.value || null })}
                  placeholder="+33 6 12 34 56 78"
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <p className="text-sm font-semibold text-white">Paiement sur place</p>
                <p className="text-xs text-white/60">Chèque ou espèces</p>
              </div>
              <Switch
                className="switch-root"
                checked={config.methods.cash.enabled}
                onCheckedChange={(checked) => updateMethod("cash", { enabled: checked })}
              />
            </div>
          </div>

          <Separator className="bg-white/10" />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-white/70">Email de confirmation</Label>
              <Input
                type="email"
                value={config.confirmationEmail ?? ""}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    confirmationEmail: event.target.value || null,
                  }))
                }
                placeholder="contact@club.fr"
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Délai de paiement (heures)</Label>
              <Input
                type="number"
                min={0}
                value={Number.isNaN(config.paymentDeadlineHours) ? "" : config.paymentDeadlineHours}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    paymentDeadlineHours: Number(event.target.value || 0),
                  }))
                }
                className="input-field"
              />
            </div>
          </div>

          {saveError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {saveError}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <GradientButton type="button" onClick={handleSave} isLoading={isSaving}>
              Enregistrer
            </GradientButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
