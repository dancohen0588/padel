"use client";

import { useMemo, useState } from "react";
import type { PaymentConfig } from "@/lib/types";

type PaymentInfoBlockProps = {
  price: number | null;
  paymentConfig: PaymentConfig | null;
  isPairMode?: boolean;
};

type MethodItem = {
  label: string;
  value?: string | null;
};

type PaymentMethodGroup = {
  title: string;
  enabled: boolean;
  items?: MethodItem[];
  icon?: string;
  iconClassName?: string;
  helper?: string;
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

export function PaymentInfoBlock({
  price,
  paymentConfig,
  isPairMode = false,
}: PaymentInfoBlockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isPaid = (price ?? 0) > 0;

  const safeConfig = useMemo(() => {
    if (!paymentConfig) {
      console.warn("[payment-info] missing paymentConfig, fallback defaults");
      return DEFAULT_PAYMENT_CONFIG;
    }
    if (!paymentConfig.methods) {
      console.warn("[payment-info] missing methods, fallback defaults");
      return { ...DEFAULT_PAYMENT_CONFIG, ...paymentConfig };
    }
    return {
      ...DEFAULT_PAYMENT_CONFIG,
      ...paymentConfig,
      methods: {
        ...DEFAULT_PAYMENT_CONFIG.methods,
        ...paymentConfig.methods,
      },
    };
  }, [paymentConfig]);

  const methods = useMemo<PaymentMethodGroup[]>(() => {
    if (!safeConfig) return [];
    return [
      {
        title: "Virement bancaire",
        enabled: safeConfig.methods.bank.enabled,
        icon: "🏦",
        iconClassName: "from-blue-500 to-blue-600",
        items: [
          { label: "IBAN", value: safeConfig.methods.bank.iban },
          { label: "BIC", value: safeConfig.methods.bank.bic },
        ],
        helper: "Précisez votre nom dans le libellé",
      },
      {
        title: "Lydia",
        enabled: safeConfig.methods.lydia.enabled,
        icon: "💜",
        iconClassName: "from-purple-500 to-purple-600",
        items: [{ label: "Identifiant", value: safeConfig.methods.lydia.identifier }],
        helper: "Paiement instantané - Idéal pour mobile",
      },
      {
        title: "Revolut",
        enabled: safeConfig.methods.revolut.enabled,
        icon: "💎",
        iconClassName: "from-cyan-500 to-cyan-600",
        items: [
          { label: "Lien", value: safeConfig.methods.revolut.link },
          { label: "Tag", value: safeConfig.methods.revolut.tag },
        ],
        helper: "Transfert rapide et gratuit",
      },
      {
        title: "Wero",
        enabled: safeConfig.methods.wero.enabled,
        icon: "🌊",
        iconClassName: "from-green-500 to-green-600",
        items: [{ label: "Identifiant", value: safeConfig.methods.wero.identifier }],
        helper: "Nouveau moyen de paiement européen",
      },
      {
        title: "Espèces",
        enabled: safeConfig.methods.cash.enabled,
        icon: "💵",
        iconClassName: "from-amber-500 to-amber-600",
        items: [{ label: "Détails", value: "Paiement sur place le jour du tournoi" }],
        helper: "Monnaie acceptée - Prévoir l'appoint",
      },
    ];
  }, [safeConfig]);

  if (!isPaid || !safeConfig?.enabled) return null;

  const formattedPrice = price?.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

  const formattedPairPrice =
    price !== null
      ? (price * 2).toLocaleString("fr-FR", {
          style: "currency",
          currency: "EUR",
        })
      : null;

  const visibleMethods = methods.filter((method) => method.enabled);

  return (
    <div className="rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-600/5 p-5 text-white">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-2xl">💳</div>
        <div className="flex-1">
          <h3 className="mb-2 text-sm font-semibold text-orange-400">Informations de paiement</h3>
          <p className="mb-3 text-xs text-white/70">
            Le prix d&apos;inscription à ce tournoi est de{" "}
            <span className="font-bold text-white">{formattedPrice}</span>
            {isPairMode && formattedPairPrice ? (
              <span>
                {" "}par joueur (soit {formattedPairPrice} pour le binôme)
              </span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="w-full rounded-lg border border-orange-500/60 bg-orange-500/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-orange-500 hover:bg-orange-500/30"
          >
            Voir les moyens de paiement
          </button>

          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <span className="text-base">⚠️</span>
            <p className="text-xs text-amber-200">
              <strong>Important :</strong> Votre inscription ne sera validée qu&apos;après réception du paiement.
              {safeConfig.paymentDeadlineHours
                ? ` Merci d'effectuer le règlement dans les ${safeConfig.paymentDeadlineHours}h suivant votre inscription.`
                : ""}
            </p>
          </div>
        </div>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur" onClick={() => setIsOpen(false)} />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-white/10 bg-[#1E1E2E] p-6 text-white shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Moyens de paiement</h2>
                <p className="mt-1 text-sm text-white/60">
                  Choisissez votre méthode de règlement
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Fermer"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {visibleMethods.length ? (
                visibleMethods.map((method) => (
                  <div key={method.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${
                          method.iconClassName ?? "from-orange-500 to-orange-600"
                        } text-2xl`}
                      >
                        {method.icon ?? "💳"}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-white">{method.title}</h3>
                        {method.items?.length ? (
                          <div className="mt-1 space-y-0.5 text-xs text-white/60">
                            {method.items.map((item) => (
                              <p key={item.label}>
                                {item.label} : {item.value || "—"}
                              </p>
                            ))}
                          </div>
                        ) : null}
                        {method.helper ? (
                          <p className="mt-1.5 text-xs text-orange-400">{method.helper}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
                  Aucun moyen de paiement n&apos;est configuré pour ce tournoi.
                </div>
              )}
            </div>

            <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">✅</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-emerald-300">Confirmation de paiement</p>
                  <p className="mt-1 text-xs text-emerald-200/80">
                    Après votre paiement, envoyez une capture d&apos;écran ou une confirmation par email à{" "}
                    {safeConfig.confirmationEmail ? (
                      <a
                        href={`mailto:${safeConfig.confirmationEmail}`}
                        className="font-semibold text-emerald-300 underline"
                      >
                        {safeConfig.confirmationEmail}
                      </a>
                    ) : (
                      <span className="font-semibold text-emerald-300">l&apos;organisateur</span>
                    )}{" "}
                    pour validation rapide.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-white/10 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
