# Prompt - Implémentation des Paiements pour Tournois de Padel

## 📋 Contexte du Projet

**Projet** : Application Next.js 14+ (App Router) de gestion de tournois de padel
**Base de données** : PostgreSQL avec SQL direct (pas de Prisma)
**Stack technique** :
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- PostgreSQL
- Server Actions

## 🎯 Objectif

Implémenter un système de **configuration des moyens de paiement** pour les tournois avec deux volets :

1. **Interface Admin** : Ajouter un onglet "Paiements" dans `/admin/inscriptions` permettant de configurer les moyens de paiement
2. **Formulaire d'Inscription** : Afficher un bloc "Informations de paiement" avec un modal détaillant les moyens de paiement configurés

### Moyens de paiement supportés

| Moyen | Configuration nécessaire | Emoji | Couleur |
|-------|-------------------------|-------|---------|
| **Virement bancaire** | IBAN + BIC | 🏦 | Bleu |
| **Lydia** | Identifiant Lydia | 💜 | Violet |
| **Revolut** | Lien + Tag | 💎 | Cyan |
| **Wero** | Identifiant | 🌊 | Vert |
| **Espèces** | Aucune | 💵 | Ambre |

## 🎨 Aperçu UX

### Dans le formulaire d'inscription

```
┌─────────────────────────────────────────┐
│ 💳 Informations de paiement            │
│                                         │
│ Le prix d'inscription à ce tournoi est │
│ de 25,00 €                             │
│                                         │
│ ┌─────────────────────────────────────┐│
│ │ Voir les moyens de paiement         ││
│ └─────────────────────────────────────┘│
│                                         │
│ ⚠️ Important : Votre inscription ne    │
│ sera validée qu'après réception du     │
│ paiement. Merci d'effectuer le         │
│ règlement dans les 48h suivant votre   │
│ inscription.                            │
└─────────────────────────────────────────┘
```

### Modal des moyens de paiement

```
┌────────────────────────────────────────────┐
│  Moyens de paiement                    ✕  │
│  Choisissez votre méthode de règlement    │
│                                            │
│  ┌────────────────────────────────────┐   │
│  │ 🏦 Virement bancaire               │   │
│  │ IBAN : FR76 1234 5678 9012...      │   │
│  │ BIC : ABCDEFGHIJK                  │   │
│  └────────────────────────────────────┘   │
│                                            │
│  ┌────────────────────────────────────┐   │
│  │ 💜 Lydia                           │   │
│  │ Identifiant : @PadelClub           │   │
│  └────────────────────────────────────┘   │
│                                            │
│  ✅ Après votre paiement, envoyez une     │
│  capture d'écran à paiement@club.fr       │
└────────────────────────────────────────────┘
```

---

# 🗄️ PARTIE 1 : BASE DE DONNÉES

## 1.1 - Migration pour la Configuration des Paiements

### Fichier à créer : `database/migrations/003_add_payment_config.sql`

```sql
-- Migration: Ajout de la configuration des paiements dans tournaments

-- Ajouter la colonne payment_config (JSON)
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS payment_config JSONB DEFAULT '{
    "enabled": false,
    "methods": {
      "bank": {
        "enabled": false,
        "iban": null,
        "bic": null
      },
      "lydia": {
        "enabled": false,
        "identifier": null
      },
      "revolut": {
        "enabled": false,
        "link": null,
        "tag": null
      },
      "wero": {
        "enabled": false,
        "identifier": null
      },
      "cash": {
        "enabled": false
      }
    },
    "confirmationEmail": null,
    "paymentDeadlineHours": 48
  }'::jsonb;

-- Commenter pour la documentation
COMMENT ON COLUMN public.tournaments.payment_config IS 'Configuration des moyens de paiement pour le tournoi (JSON)';
```

### Structure JSON attendue

```typescript
type PaymentConfig = {
  enabled: boolean;  // Active/désactive l'affichage du bloc paiement
  methods: {
    bank: {
      enabled: boolean;
      iban: string | null;
      bic: string | null;
    };
    lydia: {
      enabled: boolean;
      identifier: string | null;
    };
    revolut: {
      enabled: boolean;
      link: string | null;
      tag: string | null;
    };
    wero: {
      enabled: boolean;
      identifier: string | null;
    };
    cash: {
      enabled: boolean;
    };
  };
  confirmationEmail: string | null;
  paymentDeadlineHours: number;
};
```

---

# 🔧 PARTIE 2 : TYPES & UTILITAIRES

## 2.1 - Mise à Jour du Type Tournament

### Fichier à modifier : `src/lib/types.ts`

**Ajouter** le type de configuration de paiement et mettre à jour le type `Tournament` :

```typescript
// Types pour la configuration des paiements
export type PaymentMethodBank = {
  enabled: boolean;
  iban: string | null;
  bic: string | null;
};

export type PaymentMethodLydia = {
  enabled: boolean;
  identifier: string | null;
};

export type PaymentMethodRevolut = {
  enabled: boolean;
  link: string | null;
  tag: string | null;
};

export type PaymentMethodWero = {
  enabled: boolean;
  identifier: string | null;
};

export type PaymentMethodCash = {
  enabled: boolean;
};

export type PaymentConfig = {
  enabled: boolean;
  methods: {
    bank: PaymentMethodBank;
    lydia: PaymentMethodLydia;
    revolut: PaymentMethodRevolut;
    wero: PaymentMethodWero;
    cash: PaymentMethodCash;
  };
  confirmationEmail: string | null;
  paymentDeadlineHours: number;
};

// Mettre à jour le type Tournament existant
export type Tournament = {
  // ... champs existants ...
  price: number | null;
  paymentConfig: PaymentConfig;  // ⬅️ AJOUTER
};
```

---

# 👨‍💼 PARTIE 3 : INTERFACE ADMIN

## 3.1 - Nouvel Onglet "Paiements" dans l'Admin

### Fichier à créer : `src/components/admin/tabs/PaymentsTab.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import type { Tournament, PaymentConfig } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type PaymentsTabProps = {
  tournament: Tournament | null;
  onUpdate: (config: PaymentConfig) => Promise<void>;
};

const DEFAULT_CONFIG: PaymentConfig = {
  enabled: false,
  methods: {
    bank: { enabled: false, iban: null, bic: null },
    lydia: { enabled: false, identifier: null },
    revolut: { enabled: false, link: null, tag: null },
    wero: { enabled: false, identifier: null },
    cash: { enabled: false },
  },
  confirmationEmail: null,
  paymentDeadlineHours: 48,
};

export function PaymentsTab({ tournament, onUpdate }: PaymentsTabProps) {
  const [config, setConfig] = useState<PaymentConfig>(DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (tournament?.paymentConfig) {
      setConfig(tournament.paymentConfig);
    } else {
      setConfig(DEFAULT_CONFIG);
    }
  }, [tournament]);

  const handleSave = async () => {
    if (!tournament) return;
    setIsSaving(true);
    try {
      await onUpdate(config);
    } finally {
      setIsSaving(false);
    }
  };

  const updateMethod = <K extends keyof PaymentConfig["methods"]>(
    method: K,
    updates: Partial<PaymentConfig["methods"][K]>
  ) => {
    setConfig((prev) => ({
      ...prev,
      methods: {
        ...prev.methods,
        [method]: {
          ...prev.methods[method],
          ...updates,
        },
      },
    }));
  };

  if (!tournament) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Sélectionnez un tournoi pour configurer les paiements
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuration des paiements</h2>
        <p className="text-muted-foreground">
          Gérez les moyens de paiement acceptés pour ce tournoi
        </p>
      </div>

      {/* Activation globale */}
      <Card>
        <CardHeader>
          <CardTitle>Activer les paiements</CardTitle>
          <CardDescription>
            Si activé, les participants verront un bloc "Informations de paiement" sur le formulaire
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) =>
                setConfig((prev) => ({ ...prev, enabled: checked }))
              }
            />
            <span className="text-sm font-medium">
              {config.enabled ? "Paiements activés" : "Paiements désactivés"}
            </span>
          </div>
        </CardContent>
      </Card>

      {config.enabled && (
        <>
          <Separator />

          {/* Virement bancaire */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏦</span>
                <div>
                  <CardTitle>Virement bancaire</CardTitle>
                  <CardDescription>Coordonnées bancaires (IBAN et BIC)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={config.methods.bank.enabled}
                  onCheckedChange={(checked) =>
                    updateMethod("bank", { enabled: checked })
                  }
                />
                <span className="text-sm font-medium">Activer ce moyen de paiement</span>
              </div>

              {config.methods.bank.enabled && (
                <div className="space-y-3 pl-7">
                  <Label>
                    IBAN
                    <Input
                      placeholder="FR76 1234 5678 9012 3456 7890 123"
                      value={config.methods.bank.iban ?? ""}
                      onChange={(e) => updateMethod("bank", { iban: e.target.value })}
                      className="mt-2"
                    />
                  </Label>
                  <Label>
                    BIC
                    <Input
                      placeholder="ABCDEFGHIJK"
                      value={config.methods.bank.bic ?? ""}
                      onChange={(e) => updateMethod("bank", { bic: e.target.value })}
                      className="mt-2"
                    />
                  </Label>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lydia */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="text-2xl">💜</span>
                <div>
                  <CardTitle>Lydia</CardTitle>
                  <CardDescription>Identifiant Lydia pour paiement mobile</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={config.methods.lydia.enabled}
                  onCheckedChange={(checked) =>
                    updateMethod("lydia", { enabled: checked })
                  }
                />
                <span className="text-sm font-medium">Activer ce moyen de paiement</span>
              </div>

              {config.methods.lydia.enabled && (
                <div className="pl-7">
                  <Label>
                    Identifiant Lydia
                    <Input
                      placeholder="@PadelClub"
                      value={config.methods.lydia.identifier ?? ""}
                      onChange={(e) =>
                        updateMethod("lydia", { identifier: e.target.value })
                      }
                      className="mt-2"
                    />
                  </Label>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revolut */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="text-2xl">💎</span>
                <div>
                  <CardTitle>Revolut</CardTitle>
                  <CardDescription>Lien et tag Revolut</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={config.methods.revolut.enabled}
                  onCheckedChange={(checked) =>
                    updateMethod("revolut", { enabled: checked })
                  }
                />
                <span className="text-sm font-medium">Activer ce moyen de paiement</span>
              </div>

              {config.methods.revolut.enabled && (
                <div className="space-y-3 pl-7">
                  <Label>
                    Lien Revolut
                    <Input
                      placeholder="revolut.me/padelclub"
                      value={config.methods.revolut.link ?? ""}
                      onChange={(e) => updateMethod("revolut", { link: e.target.value })}
                      className="mt-2"
                    />
                  </Label>
                  <Label>
                    Tag Revolut
                    <Input
                      placeholder="@padelclub"
                      value={config.methods.revolut.tag ?? ""}
                      onChange={(e) => updateMethod("revolut", { tag: e.target.value })}
                      className="mt-2"
                    />
                  </Label>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Wero */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌊</span>
                <div>
                  <CardTitle>Wero</CardTitle>
                  <CardDescription>Nouveau moyen de paiement européen</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={config.methods.wero.enabled}
                  onCheckedChange={(checked) =>
                    updateMethod("wero", { enabled: checked })
                  }
                />
                <span className="text-sm font-medium">Activer ce moyen de paiement</span>
              </div>

              {config.methods.wero.enabled && (
                <div className="pl-7">
                  <Label>
                    Identifiant Wero
                    <Input
                      placeholder="06 12 34 56 78"
                      value={config.methods.wero.identifier ?? ""}
                      onChange={(e) =>
                        updateMethod("wero", { identifier: e.target.value })
                      }
                      className="mt-2"
                    />
                  </Label>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Espèces */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="text-2xl">💵</span>
                <div>
                  <CardTitle>Espèces</CardTitle>
                  <CardDescription>Paiement en liquide le jour du tournoi</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Switch
                  checked={config.methods.cash.enabled}
                  onCheckedChange={(checked) =>
                    updateMethod("cash", { enabled: checked })
                  }
                />
                <span className="text-sm font-medium">Activer ce moyen de paiement</span>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Email de confirmation */}
          <Card>
            <CardHeader>
              <CardTitle>Email de confirmation</CardTitle>
              <CardDescription>
                Les participants devront envoyer une preuve de paiement à cette adresse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type="email"
                placeholder="paiement@padelclub.fr"
                value={config.confirmationEmail ?? ""}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, confirmationEmail: e.target.value }))
                }
              />
            </CardContent>
          </Card>

          {/* Délai de paiement */}
          <Card>
            <CardHeader>
              <CardTitle>Délai de paiement</CardTitle>
              <CardDescription>
                Nombre d'heures après l'inscription pour effectuer le paiement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type="number"
                min="1"
                value={config.paymentDeadlineHours}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    paymentDeadlineHours: parseInt(e.target.value, 10) || 48,
                  }))
                }
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Valeur recommandée : 48 heures
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Bouton de sauvegarde */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || !tournament}>
          {isSaving ? "Enregistrement..." : "Enregistrer la configuration"}
        </Button>
      </div>
    </div>
  );
}
```

---

## 3.2 - Intégrer l'Onglet dans AdminPage

### Fichier à modifier : `src/app/admin/inscriptions/page.tsx`

#### Import

**Ajouter** :

```typescript
import { PaymentsTab } from "@/components/admin/tabs/PaymentsTab";
import type { PaymentConfig } from "@/lib/types";
```

#### État des onglets

**Modifier** le type d'onglet pour inclure "paiements" :

```typescript
type TabType = "inscrits" | "tournois" | "paiements";
const [activeTab, setActiveTab] = useState<TabType>("inscrits");
```

#### Fonction de mise à jour

**Ajouter** une fonction pour sauvegarder la configuration :

```typescript
const handleUpdatePaymentConfig = async (config: PaymentConfig) => {
  if (!selectedTournament) return;

  try {
    const response = await fetch(`/api/tournaments/${selectedTournament.id}/payment-config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentConfig: config }),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la sauvegarde");
    }

    // Rafraîchir les données
    window.location.reload();
  } catch (error) {
    console.error("Erreur de sauvegarde:", error);
    alert("Erreur lors de la sauvegarde de la configuration.");
  }
};
```

#### Boutons d'onglets

**Ajouter** le bouton "Paiements" :

```tsx
<div className="flex gap-2 border-b">
  <button
    onClick={() => setActiveTab("inscrits")}
    className={`px-4 py-2 ${activeTab === "inscrits" ? "border-b-2 border-orange-500 font-semibold" : ""}`}
  >
    Inscrits
  </button>
  <button
    onClick={() => setActiveTab("tournois")}
    className={`px-4 py-2 ${activeTab === "tournois" ? "border-b-2 border-orange-500 font-semibold" : ""}`}
  >
    Tournois
  </button>
  <button
    onClick={() => setActiveTab("paiements")}
    className={`px-4 py-2 ${activeTab === "paiements" ? "border-b-2 border-orange-500 font-semibold" : ""}`}
  >
    💳 Paiements
  </button>
</div>
```

#### Rendu conditionnel

**Ajouter** le rendu de l'onglet Paiements :

```tsx
{activeTab === "paiements" && (
  <PaymentsTab
    tournament={selectedTournament}
    onUpdate={handleUpdatePaymentConfig}
  />
)}
```

---

## 3.3 - API de Mise à Jour de la Configuration

### Fichier à créer : `src/app/api/tournaments/[id]/payment-config/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/database";
import type { PaymentConfig } from "@/lib/types";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const tournamentId = params.id;
    const body = (await request.json()) as { paymentConfig: PaymentConfig };

    if (!tournamentId) {
      return NextResponse.json(
        { success: false, error: "Tournoi introuvable." },
        { status: 400 }
      );
    }

    const database = getDatabaseClient();

    await database`
      UPDATE tournaments
      SET payment_config = ${database.json(body.paymentConfig)}
      WHERE id = ${tournamentId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[payment-config] error", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur." },
      { status: 500 }
    );
  }
}
```

---

# 📝 PARTIE 4 : FORMULAIRE D'INSCRIPTION

## 4.1 - Composant PaymentInfoBlock

### Fichier à créer : `src/components/registration/PaymentInfoBlock.tsx`

```typescript
"use client";

import { useState } from "react";
import type { PaymentConfig } from "@/lib/types";

type PaymentInfoBlockProps = {
  price: number;
  paymentConfig: PaymentConfig;
};

export function PaymentInfoBlock({ price, paymentConfig }: PaymentInfoBlockProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const enabledMethods = Object.entries(paymentConfig.methods).filter(
    ([_, method]) => method.enabled
  );

  if (!paymentConfig.enabled || enabledMethods.length === 0) {
    return null;
  }

  const formattedPrice = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);

  return (
    <>
      {/* Bloc principal */}
      <div className="rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-600/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-2xl">💳</div>
          <div className="flex-1">
            <h3 className="mb-2 text-sm font-semibold text-orange-400">
              Informations de paiement
            </h3>
            <p className="mb-3 text-xs text-white/70">
              Le prix d'inscription à ce tournoi est de{" "}
              <span className="font-bold text-white">{formattedPrice}</span>
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full rounded-lg border border-orange-500/60 bg-orange-500/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-orange-500 hover:bg-orange-500/30"
            >
              Voir les moyens de paiement
            </button>

            {/* Warning Notice */}
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <span className="text-base">⚠️</span>
              <p className="text-xs text-amber-200">
                <strong>Important :</strong> Votre inscription ne sera validée qu'après
                réception du paiement. Merci d'effectuer le règlement dans les{" "}
                {paymentConfig.paymentDeadlineHours}h suivant votre inscription.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="modal-backdrop absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-white/10 bg-[#1E1E2E] p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Moyens de paiement</h2>
                <p className="mt-1 text-sm text-white/60">
                  Choisissez votre méthode de règlement
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Fermer"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Payment Methods Grid */}
            <div className="space-y-3">
              {/* Virement Bancaire */}
              {paymentConfig.methods.bank.enabled && (
                <div className="payment-card rounded-xl border border-white/10 bg-white/5 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-2xl">
                      🏦
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-white">
                        Virement bancaire
                      </h3>
                      {paymentConfig.methods.bank.iban && (
                        <p className="mt-1 text-xs text-white/60">
                          IBAN : {paymentConfig.methods.bank.iban}
                        </p>
                      )}
                      {paymentConfig.methods.bank.bic && (
                        <p className="mt-0.5 text-xs text-white/60">
                          BIC : {paymentConfig.methods.bank.bic}
                        </p>
                      )}
                      <p className="mt-1.5 text-xs text-orange-400">
                        Précisez votre nom dans le libellé
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Lydia */}
              {paymentConfig.methods.lydia.enabled && (
                <div className="payment-card rounded-xl border border-white/10 bg-white/5 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-2xl">
                      💜
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-white">Lydia</h3>
                      {paymentConfig.methods.lydia.identifier && (
                        <p className="mt-1 text-xs text-white/60">
                          Identifiant : {paymentConfig.methods.lydia.identifier}
                        </p>
                      )}
                      <p className="mt-1.5 text-xs text-orange-400">
                        Paiement instantané - Idéal pour mobile
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Revolut */}
              {paymentConfig.methods.revolut.enabled && (
                <div className="payment-card rounded-xl border border-white/10 bg-white/5 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 text-2xl">
                      💎
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-white">Revolut</h3>
                      {paymentConfig.methods.revolut.link && (
                        <p className="mt-1 text-xs text-white/60">
                          Lien : {paymentConfig.methods.revolut.link}
                        </p>
                      )}
                      {paymentConfig.methods.revolut.tag && (
                        <p className="mt-0.5 text-xs text-white/60">
                          Tag : {paymentConfig.methods.revolut.tag}
                        </p>
                      )}
                      <p className="mt-1.5 text-xs text-orange-400">
                        Transfert rapide et gratuit
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Wero */}
              {paymentConfig.methods.wero.enabled && (
                <div className="payment-card rounded-xl border border-white/10 bg-white/5 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-2xl">
                      🌊
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-white">Wero</h3>
                      {paymentConfig.methods.wero.identifier && (
                        <p className="mt-1 text-xs text-white/60">
                          Identifiant : {paymentConfig.methods.wero.identifier}
                        </p>
                      )}
                      <p className="mt-1.5 text-xs text-orange-400">
                        Nouveau moyen de paiement européen
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Espèces */}
              {paymentConfig.methods.cash.enabled && (
                <div className="payment-card rounded-xl border border-white/10 bg-white/5 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-2xl">
                      💵
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-white">Espèces</h3>
                      <p className="mt-1 text-xs text-white/60">
                        Paiement sur place le jour du tournoi
                      </p>
                      <p className="mt-1.5 text-xs text-orange-400">
                        Monnaie acceptée - Prévoir l'appoint
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Important Notice */}
            {paymentConfig.confirmationEmail && (
              <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">✅</span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-emerald-300">
                      Confirmation de paiement
                    </p>
                    <p className="mt-1 text-xs text-emerald-200/80">
                      Après votre paiement, envoyez une capture d'écran ou une
                      confirmation par email à{" "}
                      <a
                        href={`mailto:${paymentConfig.confirmationEmail}`}
                        className="font-semibold text-emerald-300 underline"
                      >
                        {paymentConfig.confirmationEmail}
                      </a>{" "}
                      pour validation rapide.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg bg-white/10 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

---

## 4.2 - Intégration dans RegistrationForm

### Fichier à modifier : `src/app/inscription/registration-form.tsx`

#### Import

**Ajouter** :

```typescript
import { PaymentInfoBlock } from "@/components/registration/PaymentInfoBlock";
```

#### Props

Le composant `RegistrationForm` reçoit déjà les props `tournament` qui contient maintenant `price` et `paymentConfig`.

#### Placement du composant

**IMPORTANT** : Le bloc paiement doit être ajouté **À LA FIN du formulaire**, juste **AVANT** les boutons de soumission.

**Après** la section de upload de photo (vers la ligne 550-600), **AVANT** les boutons Submit, **ajouter** :

```tsx
{/* BLOC PAIEMENT */}
{tournament.price !== null && tournament.price > 0 && tournament.paymentConfig && (
  <PaymentInfoBlock
    price={tournament.price}
    paymentConfig={tournament.paymentConfig}
  />
)}
```

**Note critique** : Ne pas modifier le reste du formulaire. Le switch "Non, première fois / Oui, j'ai déjà joué" doit rester intact. Les champs existants ne doivent pas être réordonnés. Le bloc paiement s'ajoute simplement à la fin.

---

## 4.3 - Récupération de paymentConfig dans page.tsx

### Fichier à modifier : `src/app/tournaments/[slug]/register/page.tsx`

Dans la requête SQL pour récupérer le tournoi (vers ligne 20-40), **ajouter** `payment_config` :

```typescript
const database = getDatabaseClient();

const [tournament] = await database<
  Array<{
    // ... champs existants ...
    price: number | null;
    payment_config: unknown;  // ⬅️ AJOUTER
  }>
>`
  SELECT
    id,
    slug,
    name,
    date::text as date,
    location,
    description,
    status,
    max_players,
    image_path,
    price,                    -- ⬅️ AJOUTER
    payment_config            -- ⬅️ AJOUTER
  FROM tournaments
  WHERE slug = ${slug}
  LIMIT 1
`;
```

**Mapper** vers le type Tournament :

```typescript
const mappedTournament: Tournament = {
  // ... champs existants ...
  price: tournament.price,
  paymentConfig: (tournament.payment_config as PaymentConfig) || {
    enabled: false,
    methods: {
      bank: { enabled: false, iban: null, bic: null },
      lydia: { enabled: false, identifier: null },
      revolut: { enabled: false, link: null, tag: null },
      wero: { enabled: false, identifier: null },
      cash: { enabled: false },
    },
    confirmationEmail: null,
    paymentDeadlineHours: 48,
  },
};
```

---

# ✅ CHECKLIST COMPLÈTE

## Base de données

- [ ] Migration 003 exécutée avec succès
- [ ] Colonne `payment_config` existe avec valeur par défaut
- [ ] JSON valide stocké dans la colonne

## Types

- [ ] Types `PaymentConfig` et méthodes définis dans `types.ts`
- [ ] Type `Tournament` mis à jour avec `paymentConfig`

## Admin

- [ ] Composant `PaymentsTab.tsx` créé
- [ ] Onglet "Paiements" ajouté dans `/admin/inscriptions`
- [ ] API `/payment-config/route.ts` créée
- [ ] Activation globale fonctionne
- [ ] Configuration des 5 moyens de paiement fonctionne
- [ ] Sauvegarde fonctionnelle

## Formulaire

- [ ] Composant `PaymentInfoBlock.tsx` créé
- [ ] Bloc paiement affiché si `price > 0` et `paymentConfig.enabled = true`
- [ ] Modal s'ouvre au clic sur "Voir les moyens de paiement"
- [ ] Seuls les moyens activés sont affichés dans le modal
- [ ] Email de confirmation affiché si configuré
- [ ] Délai de paiement affiché correctement
- [ ] Bloc positionné à la fin du formulaire (après photo, avant Submit)
- [ ] Fonctionne en mode "new" et "existing"

---

# 🚀 ORDRE D'EXÉCUTION RECOMMANDÉ

1. **Migration 003** → Exécuter la migration SQL
2. **Types** → Ajouter les types dans `src/lib/types.ts`
3. **API** → Créer `payment-config/route.ts`
4. **Composant Admin** → Créer `PaymentsTab.tsx`
5. **Intégration Admin** → Modifier `admin/inscriptions/page.tsx`
6. **Composant Formulaire** → Créer `PaymentInfoBlock.tsx`
7. **Intégration Formulaire** → Modifier `registration-form.tsx`
8. **Page Registration** → Modifier `tournaments/[slug]/register/page.tsx`
9. **Test complet** → Vérifier tout le flow

---

# 🧪 TESTS MANUELS

## Admin

1. **Activer paiements** → Toggle global activé
2. **Configurer virement** → IBAN + BIC renseignés
3. **Configurer Lydia** → Identifiant renseigné
4. **Configurer Revolut** → Lien + Tag renseignés
5. **Configurer Wero** → Identifiant renseigné
6. **Activer espèces** → Uniquement toggle
7. **Email confirmation** → Adresse email valide
8. **Sauvegarder** → Pas d'erreur, données persistées
9. **Rafraîchir** → Configuration toujours présente

## Formulaire

1. **Tournoi sans prix** → Bloc paiement absent
2. **Tournoi prix = 0** → Bloc paiement absent
3. **Tournoi prix > 0 et paiements désactivés** → Bloc absent
4. **Tournoi prix > 0 et paiements activés** → Bloc présent
5. **Cliquer "Voir moyens"** → Modal s'ouvre
6. **Vérifier affichage** → Seuls les moyens activés apparaissent
7. **Fermer modal** → Bouton X et clic backdrop fonctionnent
8. **Mode "new"** → Bloc affiché correctement
9. **Mode "existing"** → Bloc affiché correctement
10. **Position** → Bloc en fin de formulaire, avant Submit

---

# 📊 RÉCAPITULATIF DES FICHIERS

```
Fichiers à créer (4) :
├── database/migrations/003_add_payment_config.sql
├── src/components/admin/tabs/PaymentsTab.tsx
├── src/components/registration/PaymentInfoBlock.tsx
└── src/app/api/tournaments/[id]/payment-config/route.ts

Fichiers à modifier (4) :
├── src/lib/types.ts
├── src/app/admin/inscriptions/page.tsx
├── src/app/inscription/registration-form.tsx
└── src/app/tournaments/[slug]/register/page.tsx
```

---

# 💡 NOTES IMPORTANTES

## Comportement du Bloc Paiement

Le bloc s'affiche uniquement si :
- `tournament.price > 0` **ET**
- `tournament.paymentConfig.enabled === true` **ET**
- Au moins un moyen de paiement est activé

## Moyens de Paiement Dynamiques

Dans le modal, seuls les moyens avec `enabled: true` sont affichés. Si aucun moyen n'est activé, le bloc entier ne s'affiche pas.

## Email de Confirmation

Si `confirmationEmail` est `null` ou vide, la section "Confirmation de paiement" n'apparaît pas dans le modal.

## Intégrité du Formulaire

**CRITIQUE** : Le formulaire d'inscription existant **NE DOIT PAS** être modifié. Le bloc paiement s'ajoute simplement en fin de formulaire sans toucher aux champs existants (switch new/existing, téléphone, questionnaire, photo).

---

Bonne implémentation ! 🎾💳
