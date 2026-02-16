# Prompt - Suivi des paiements des joueurs

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

Ajouter un système de **suivi des paiements** dans l'onglet "Joueurs" de l'admin tournoi pour tracker :
- Si le joueur a payé ou non (badge visuel)
- Le moyen de paiement utilisé (liste déroulante dynamique)

### Fonctionnalités

✅ **Badge Payé / Non payé** : Badge vert "Payé" ou rouge "Non payé"
✅ **Dropdown moyen de paiement** : Liste dynamique basée sur les moyens activés dans `/admin/inscriptions`
✅ **Liaison avec config globale** : Les moyens affichés proviennent de `PaymentConfig` (bank, lydia, revolut, wero, cash)
✅ **Sauvegarde automatique** : Le changement de statut ou de moyen se sauvegarde via Server Action
✅ **Statistique** : Card "Ont payé" dans les stats
✅ **État désactivé** : Dropdown grisée si le joueur n'a pas payé

---

# 🗄️ PARTIE 1 : BASE DE DONNÉES

## 1.1 - Modification du schéma

La table `registrations` doit stocker les informations de paiement.

### Migration SQL à créer

```sql
-- Fichier : migrations/XXX_add_payment_tracking.sql

-- 1. Ajouter les colonnes de tracking du paiement
ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS payment_status BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP;

-- 2. Index pour optimiser les requêtes de paiement
CREATE INDEX IF NOT EXISTS idx_registrations_payment
ON registrations(tournament_id, payment_status, payment_date DESC);

-- 3. Commentaires
COMMENT ON COLUMN registrations.payment_status IS 'Indique si le joueur a payé son inscription';
COMMENT ON COLUMN registrations.payment_method IS 'Moyen de paiement utilisé (bank, lydia, revolut, wero, cash)';
COMMENT ON COLUMN registrations.payment_date IS 'Date à laquelle le paiement a été marqué comme payé';
```

---

# 🔧 PARTIE 2 : TYPES TYPESCRIPT

## 2.1 - Mise à jour des types

### Fichier à modifier : `src/lib/types.ts`

```typescript
// Type pour les moyens de paiement (correspond aux clés de PaymentConfig.methods)
export type PaymentMethodKey = "bank" | "lydia" | "revolut" | "wero" | "cash";

// Mettre à jour le type Registration pour inclure les infos de paiement
export type Registration = {
  id: string;
  tournament_id: string;
  player_id: string;
  status: RegistrationStatus;
  registered_at: Date;
  waitlist_added_at: Date | null;
  payment_status: boolean;  // ⬅️ AJOUTER
  payment_method: PaymentMethodKey | null;  // ⬅️ AJOUTER
  payment_date: Date | null;  // ⬅️ AJOUTER
  // ... autres champs
};

export type RegistrationWithPlayer = Registration & {
  player: Player;
  hasJoinedWhatsApp?: boolean;
  whatsappJoinDate?: string | null;
};

// Type existant PaymentConfig (déjà défini)
export type PaymentConfig = {
  enabled: boolean;
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

// Helper pour obtenir les moyens de paiement activés
export function getEnabledPaymentMethods(config: PaymentConfig): Array<{
  key: PaymentMethodKey;
  label: string;
  icon: string;
}> {
  const allMethods = [
    { key: "bank" as const, label: "Virement bancaire", icon: "🏦" },
    { key: "lydia" as const, label: "Lydia", icon: "💜" },
    { key: "revolut" as const, label: "Revolut", icon: "💳" },
    { key: "wero" as const, label: "Wero", icon: "💰" },
    { key: "cash" as const, label: "Paiement sur place", icon: "💵" },
  ];

  return allMethods.filter((method) => config.methods[method.key]?.enabled);
}
```

---

# 📡 PARTIE 3 : BACKEND - Requêtes SQL

## 3.1 - Modifier les requêtes existantes

### Fichier à modifier : `src/lib/queries.ts`

**Fonction `getRegistrationsByStatus`** - Ajouter les champs de paiement :

```typescript
export async function getRegistrationsByStatus(
  tournamentId: string
): Promise<RegistrationWithPlayer[]> {
  const results = await database<
    Array<{
      id: string;
      tournament_id: string;
      player_id: string;
      status: RegistrationStatus;
      registered_at: string;
      waitlist_added_at: string | null;
      payment_status: boolean;  // ⬅️ AJOUTER
      payment_method: string | null;  // ⬅️ AJOUTER
      payment_date: string | null;  // ⬅️ AJOUTER
      player_first_name: string;
      player_last_name: string;
      player_email: string | null;
      player_phone: string;
      player_level: string | null;
      player_ranking: string | null;
      player_play_preference: string | null;
      player_photo_url: string | null;
      whatsapp_joined_tournaments: unknown;
    }>
  >`
    SELECT
      r.id,
      r.tournament_id,
      r.player_id,
      r.status,
      r.registered_at::text,
      r.waitlist_added_at::text,
      r.payment_status,  -- ⬅️ AJOUTER
      r.payment_method,  -- ⬅️ AJOUTER
      r.payment_date::text,  -- ⬅️ AJOUTER
      p.first_name as player_first_name,
      p.last_name as player_last_name,
      p.email as player_email,
      p.phone as player_phone,
      p.level as player_level,
      p.ranking as player_ranking,
      p.play_preference as player_play_preference,
      p.photo_url as player_photo_url,
      p.whatsapp_joined_tournaments
    FROM registrations r
    JOIN players p ON p.id = r.player_id
    WHERE r.tournament_id = ${tournamentId}
    ORDER BY
      CASE
        WHEN r.status = 'waitlist' THEN r.waitlist_added_at
        ELSE r.registered_at
      END DESC
  `;

  return results.map((row) => {
    const whatsappJoins = (row.whatsapp_joined_tournaments as Array<{
      tournamentId: string;
      joinedAt: string;
    }>) || [];
    const hasJoinedWhatsApp = whatsappJoins.some(
      (join) => join.tournamentId === tournamentId
    );
    const whatsappJoinDate = hasJoinedWhatsApp
      ? whatsappJoins.find((join) => join.tournamentId === tournamentId)?.joinedAt
      : null;

    return {
      id: row.id,
      tournament_id: row.tournament_id,
      player_id: row.player_id,
      status: row.status,
      registered_at: new Date(row.registered_at),
      waitlist_added_at: row.waitlist_added_at ? new Date(row.waitlist_added_at) : null,
      payment_status: row.payment_status ?? false,  // ⬅️ AJOUTER
      payment_method: (row.payment_method as PaymentMethodKey) ?? null,  // ⬅️ AJOUTER
      payment_date: row.payment_date ? new Date(row.payment_date) : null,  // ⬅️ AJOUTER
      player: {
        id: row.player_id,
        first_name: row.player_first_name,
        last_name: row.player_last_name,
        email: row.player_email,
        phone: row.player_phone,
        level: row.player_level,
        ranking: row.player_ranking,
        play_preference: row.player_play_preference,
        photo_url: row.player_photo_url,
      },
      hasJoinedWhatsApp,
      whatsappJoinDate,
    };
  });
}
```

## 3.2 - Récupérer la configuration globale de paiement

**Fonction existante `getGlobalPaymentConfig`** est déjà disponible dans `src/lib/queries.ts`.

Dans la page admin du tournoi, il faut la récupérer :

### Fichier à modifier : `src/app/tournaments/[slug]/admin/page.tsx`

```typescript
import {
  // ... imports existants
  getGlobalPaymentConfig,  // ⬅️ AJOUTER
} from "@/lib/queries";

export default async function TournamentAdminPage({
  params,
  searchParams,
}: TournamentAdminPageProps) {
  // ... code existant ...

  const [
    registrations,
    counts,
    teams,
    teamPlayers,
    pools,
    poolTeams,
    globalPaymentConfig,  // ⬅️ AJOUTER
  ] = await Promise.all([
    getRegistrationsByStatus(tournament.id),
    countRegistrations(tournament.id),
    getTeamsByTournament(tournament.id),
    getTeamPlayersByTournament(tournament.id),
    getPoolsByTournament(tournament.id),
    getPoolTeamsByTournament(tournament.id),
    getGlobalPaymentConfig(),  // ⬅️ AJOUTER
  ]);

  // ... code existant ...

  // Passer globalPaymentConfig au composant UsersValidatedTab
  return (
    <div className="min-h-screen bg-[#1E1E2E] text-white">
      {/* ... */}
      <TabsContent value="approved" className="mt-6">
        <UsersValidatedTab
          registrations={registrations}
          statusCounts={counts}
          adminToken={adminToken}
          paymentConfig={globalPaymentConfig}  // ⬅️ AJOUTER
        />
      </TabsContent>
      {/* ... */}
    </div>
  );
}
```

---

# 🎬 PARTIE 4 : SERVER ACTIONS

## 4.1 - Créer une Server Action pour le paiement

### Fichier à créer : `src/app/actions/payments.ts`

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { database } from "@/lib/database";
import { assertAdminToken } from "@/lib/admin";
import type { PaymentMethodKey } from "@/lib/types";

export async function updatePaymentStatusAction(formData: FormData) {
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

  // Si on marque comme payé, on enregistre la date et la méthode
  if (paymentStatus) {
    await database`
      UPDATE registrations
      SET
        payment_status = true,
        payment_method = ${paymentMethod || null},
        payment_date = NOW()
      WHERE id = ${registrationId}
    `;
  } else {
    // Si on marque comme non payé, on efface tout
    await database`
      UPDATE registrations
      SET
        payment_status = false,
        payment_method = NULL,
        payment_date = NULL
      WHERE id = ${registrationId}
    `;
  }

  // Récupérer le tournament_id pour revalidation
  const registration = await database<Array<{ tournament_id: string }>>`
    SELECT tournament_id
    FROM registrations
    WHERE id = ${registrationId}
  `;

  if (registration[0]) {
    revalidatePath(`/tournaments/${registration[0].tournament_id}/admin`);
  }

  return { success: true };
}

export async function updatePaymentMethodAction(formData: FormData) {
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

  // Mettre à jour uniquement la méthode de paiement
  await database`
    UPDATE registrations
    SET payment_method = ${paymentMethod}
    WHERE id = ${registrationId}
  `;

  // Récupérer le tournament_id pour revalidation
  const registration = await database<Array<{ tournament_id: string }>>`
    SELECT tournament_id
    FROM registrations
    WHERE id = ${registrationId}
  `;

  if (registration[0]) {
    revalidatePath(`/tournaments/${registration[0].tournament_id}/admin`);
  }

  return { success: true };
}
```

---

# 🎨 PARTIE 5 : FRONTEND - Composants

## 5.1 - Composant Badge Paiement

### Fichier à créer : `src/components/admin/PaymentBadge.tsx`

```typescript
"use client";

type PaymentBadgeProps = {
  isPaid: boolean;
};

export function PaymentBadge({ isPaid }: PaymentBadgeProps) {
  if (isPaid) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <span>Payé</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300">
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
      <span>Non payé</span>
    </span>
  );
}
```

## 5.2 - Composant Dropdown Moyen de Paiement

### Fichier à créer : `src/components/admin/PaymentMethodSelect.tsx`

```typescript
"use client";

import { useRouter } from "next/navigation";
import type { PaymentMethodKey, PaymentConfig } from "@/lib/types";
import { getEnabledPaymentMethods } from "@/lib/types";
import { updatePaymentMethodAction } from "@/app/actions/payments";

type PaymentMethodSelectProps = {
  registrationId: string;
  currentMethod: PaymentMethodKey | null;
  isPaid: boolean;
  paymentConfig: PaymentConfig;
  adminToken: string;
};

export function PaymentMethodSelect({
  registrationId,
  currentMethod,
  isPaid,
  paymentConfig,
  adminToken,
}: PaymentMethodSelectProps) {
  const router = useRouter();
  const enabledMethods = getEnabledPaymentMethods(paymentConfig);

  const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const method = event.target.value as PaymentMethodKey;
    if (!method) return;

    const formData = new FormData();
    formData.append("registrationId", registrationId);
    formData.append("paymentMethod", method);
    formData.append("adminToken", adminToken);

    await updatePaymentMethodAction(formData);
    router.refresh();
  };

  return (
    <select
      value={currentMethod ?? ""}
      onChange={handleChange}
      disabled={!isPaid}
      className={`rounded-lg border px-3 py-1.5 text-xs focus:outline-none focus:ring-2 ${
        isPaid
          ? "border-white/20 bg-white/10 text-white focus:border-orange-400/50 focus:ring-orange-400/20"
          : "cursor-not-allowed border-white/20 bg-white/5 text-white/40"
      }`}
    >
      <option value="" className="bg-[#1E1E2E] text-white/50">
        Moyen de paiement
      </option>
      {enabledMethods.map((method) => (
        <option
          key={method.key}
          value={method.key}
          className="bg-[#1E1E2E] text-white"
        >
          {method.icon} {method.label}
        </option>
      ))}
    </select>
  );
}
```

## 5.3 - Composant Toggle Paiement

### Fichier à créer : `src/components/admin/PaymentToggle.tsx`

```typescript
"use client";

import { useRouter } from "next/navigation";
import { updatePaymentStatusAction } from "@/app/actions/payments";

type PaymentToggleProps = {
  registrationId: string;
  isPaid: boolean;
  adminToken: string;
};

export function PaymentToggle({
  registrationId,
  isPaid,
  adminToken,
}: PaymentToggleProps) {
  const router = useRouter();

  const handleToggle = async () => {
    const formData = new FormData();
    formData.append("registrationId", registrationId);
    formData.append("paymentStatus", (!isPaid).toString());
    formData.append("paymentMethod", "");
    formData.append("adminToken", adminToken);

    await updatePaymentStatusAction(formData);
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="text-xs text-white/60 hover:text-white"
      title={isPaid ? "Marquer comme non payé" : "Marquer comme payé"}
    >
      {isPaid ? "❌" : "✓"}
    </button>
  );
}
```

---

## 5.4 - Modifier l'onglet "Joueurs"

### Fichier à modifier : `src/components/admin/tabs/UsersValidatedTab.tsx`

**Ajouter les imports** :

```typescript
import { PaymentBadge } from "@/components/admin/PaymentBadge";
import { PaymentMethodSelect } from "@/components/admin/PaymentMethodSelect";
import type { PaymentConfig } from "@/lib/types";
```

**Modifier le type des props** :

```typescript
type UsersValidatedTabProps = {
  registrations: RegistrationWithPlayer[];
  statusCounts: Record<RegistrationStatus, number>;
  adminToken: string;
  paymentConfig: PaymentConfig;  // ⬅️ AJOUTER
};

export function UsersValidatedTab({
  registrations,
  statusCounts,
  adminToken,
  paymentConfig,  // ⬅️ AJOUTER
}: UsersValidatedTabProps) {
  // ... code existant ...
```

**Ajouter le calcul de la statistique** :

```typescript
const totalCount = registrations.length;
const approvedCount = statusCounts.approved;
const teamsFormed = Math.floor(approvedCount / 2);
const approvalRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
const onWhatsAppCount = registrations.filter((reg) => reg.hasJoinedWhatsApp).length;
const paidCount = registrations.filter((reg) => reg.payment_status).length;  // ⬅️ AJOUTER
```

**Modifier la grille de stats** (passer de 4 à 5 cards) :

```tsx
<Card className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-card">
  <div className="grid gap-4 md:grid-cols-5">  {/* ⬅️ MODIFIER de 4 à 5 */}
    {/* Card Joueurs validés - EXISTANTE */}
    <div className="space-y-1 rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-2xl font-semibold">{approvedCount}</p>
      <p className="text-xs uppercase tracking-wide text-white/60">
        Joueurs validés
      </p>
    </div>

    {/* Card Équipes formées - EXISTANTE */}
    <div className="space-y-1 rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-2xl font-semibold">{teamsFormed}</p>
      <p className="text-xs uppercase tracking-wide text-white/60">
        Équipes formées
      </p>
    </div>

    {/* Card Taux de validation - EXISTANTE */}
    <div className="space-y-1 rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-2xl font-semibold">{approvalRate}%</p>
      <p className="text-xs uppercase tracking-wide text-white/60">
        Taux de validation
      </p>
    </div>

    {/* Card WhatsApp - EXISTANTE */}
    <div className="space-y-1 rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-transparent p-4">
      <div className="flex items-center gap-2">
        <p className="text-2xl font-semibold">{onWhatsAppCount}</p>
        <svg
          className="h-5 w-5 text-green-400"
          fill="currentColor"
          viewBox="0 0 24 24"
          style={{ animation: "subtlePulse 2s ease-in-out infinite" }}
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      </div>
      <p className="text-xs uppercase tracking-wide text-green-300/80">
        Sur WhatsApp
      </p>
    </div>

    {/* Card Paiements - ⬅️ NOUVELLE */}
    <div className="space-y-1 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent p-4">
      <div className="flex items-center gap-2">
        <p className="text-2xl font-semibold">{paidCount}</p>
        <svg
          className="h-5 w-5 text-emerald-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>
      <p className="text-xs uppercase tracking-wide text-emerald-300/80">
        Ont payé
      </p>
    </div>
  </div>
</Card>
```

**Dans la grille des joueurs, ajouter la section paiement** :

```tsx
{/* Grille des joueurs validés */}
<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
  {approved.length ? (
    approved.map((registration) => {
      const rankingValue = registration.player.ranking?.toString().trim();
      const playPreferenceValue = registration.player.play_preference?.toString().trim();

      return (
        <Card
          key={registration.id}
          className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white shadow-card"
        >
          {/* Contenu existant de la card... */}
          <div className="flex items-start gap-4">
            {/* ... avatar et infos joueur ... */}
          </div>

          {/* SECTION PAIEMENT - ⬅️ AJOUTER APRÈS LES INFOS JOUEUR */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <PaymentBadge isPaid={registration.payment_status} />
              <PaymentMethodSelect
                registrationId={registration.id}
                currentMethod={registration.payment_method}
                isPaid={registration.payment_status}
                paymentConfig={paymentConfig}
                adminToken={adminToken}
              />
            </div>

            {/* Bouton existant "Repasser en attente" */}
            <form
              action={async (formData) => {
                await updateRegistrationStatusAction(formData);
                router.refresh();
              }}
            >
              <input type="hidden" name="registrationId" value={registration.id} />
              <input type="hidden" name="status" value="pending" />
              <input type="hidden" name="adminToken" value={adminToken} />
              <GradientButton
                type="submit"
                className="w-full bg-white/10 text-white"
              >
                ↶ Repasser en attente
              </GradientButton>
            </form>
          </div>
        </Card>
      );
    })
  ) : (
    <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-10 text-center text-sm text-white/60">
      Aucun joueur validé.
    </div>
  )}
</div>
```

**Ajouter une card info en bas** :

```tsx
{/* Info Notice Paiement - ⬅️ AJOUTER APRÈS LA GRILLE */}
<Card className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent p-4">
  <div className="flex items-start gap-3">
    <svg
      className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-400"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
    <div className="flex-1">
      <p className="text-sm font-semibold text-blue-300">Suivi des paiements</p>
      <p className="mt-1 text-xs text-white/70">
        Le badge indique si le joueur a réglé son inscription. Sélectionnez le moyen
        de paiement utilisé dans la liste déroulante. Les moyens disponibles sont
        configurés dans l'onglet "Paiements" de l'admin (/admin/inscriptions).
      </p>
    </div>
  </div>
</Card>
```

---

# ✅ CHECKLIST COMPLÈTE

## Base de données
- [ ] Migration ajoutant les colonnes `payment_status`, `payment_method`, `payment_date`
- [ ] Index créé pour optimiser les requêtes de paiement

## Backend
- [ ] Type `PaymentMethodKey` ajouté
- [ ] Type `Registration` mis à jour avec les champs de paiement
- [ ] Helper `getEnabledPaymentMethods` créé
- [ ] Fonction `getRegistrationsByStatus` mise à jour
- [ ] Import `getGlobalPaymentConfig` ajouté dans la page admin tournoi
- [ ] `paymentConfig` passé au composant `UsersValidatedTab`

## Server Actions
- [ ] Fichier `src/app/actions/payments.ts` créé
- [ ] Action `updatePaymentStatusAction` créée
- [ ] Action `updatePaymentMethodAction` créée

## Frontend - Composants
- [ ] `PaymentBadge.tsx` créé (badge vert/rouge)
- [ ] `PaymentMethodSelect.tsx` créé (dropdown dynamique)
- [ ] `PaymentToggle.tsx` créé (optionnel, pour toggle rapide)
- [ ] `UsersValidatedTab.tsx` modifié :
  - [ ] Import des nouveaux composants
  - [ ] Prop `paymentConfig` ajoutée
  - [ ] Stat `paidCount` calculée
  - [ ] Card "Ont payé" ajoutée (5ème card)
  - [ ] Section paiement ajoutée dans les cards joueurs
  - [ ] Card info paiement ajoutée en bas

---

# 🚀 ORDRE D'EXÉCUTION RECOMMANDÉ

1. **Migration SQL** → Créer et exécuter la migration
2. **Types** → Mettre à jour `src/lib/types.ts`
3. **Queries** → Modifier `src/lib/queries.ts`
4. **Page Admin Tournoi** → Ajouter `getGlobalPaymentConfig` dans `page.tsx`
5. **Server Actions** → Créer `src/app/actions/payments.ts`
6. **Composants** → Créer `PaymentBadge.tsx`, `PaymentMethodSelect.tsx`
7. **UsersValidatedTab** → Modifier `src/components/admin/tabs/UsersValidatedTab.tsx`
8. **Test** → Tester tous les cas (payé/non payé, dropdown, stats)

---

# 🧪 TESTS MANUELS

## Configuration des moyens de paiement

1. **Configurer les moyens** dans `/admin/inscriptions?token=ADMIN_TOKEN`
   - Aller dans l'onglet "Paiements"
   - Activer "Virement bancaire" et "Lydia"
   - Désactiver les autres
   - Sauvegarder

2. **Vérifier dans l'admin tournoi**
   - Aller dans `/tournaments/<slug>/admin?token=ADMIN_TOKEN`
   - Onglet "Joueurs"
   - Vérifier que la dropdown affiche uniquement "Virement bancaire" et "Lydia"

## Flux de paiement

1. **Marquer comme payé**
   - Cliquer sur le badge "Non payé" d'un joueur (ou utiliser le toggle)
   - Vérifier que le badge devient vert "Payé"
   - Vérifier que la dropdown devient active

2. **Sélectionner un moyen**
   - Choisir "Lydia" dans la dropdown
   - Recharger la page
   - Vérifier que "Lydia" est bien sélectionné

3. **Statistiques**
   - Vérifier que la card "Ont payé" affiche le bon nombre
   - Marquer plusieurs joueurs comme payés
   - Vérifier que le compteur se met à jour

4. **Marquer comme non payé**
   - Cliquer sur le badge "Payé"
   - Vérifier qu'il devient rouge "Non payé"
   - Vérifier que la dropdown est désactivée et grisée

## Cas limites

- [ ] Vérifier avec 0 moyen de paiement activé (dropdown vide)
- [ ] Vérifier avec tous les moyens activés (5 options)
- [ ] Vérifier que les moyens désactivés n'apparaissent pas
- [ ] Vérifier le responsive sur mobile/tablet/desktop
- [ ] Vérifier que les joueurs en liste d'attente ne sont pas affectés

---

# 📊 RÉCAPITULATIF DES FICHIERS

```
Fichiers à créer (4) :
├── migrations/XXX_add_payment_tracking.sql
├── src/app/actions/payments.ts
├── src/components/admin/PaymentBadge.tsx
└── src/components/admin/PaymentMethodSelect.tsx

Fichiers à modifier (3) :
├── src/lib/types.ts
│   ├── Ajouter PaymentMethodKey
│   ├── Ajouter payment_status, payment_method, payment_date à Registration
│   └── Ajouter helper getEnabledPaymentMethods
├── src/lib/queries.ts
│   └── Modifier getRegistrationsByStatus (ajouter 3 champs)
├── src/app/tournaments/[slug]/admin/page.tsx
│   ├── Import getGlobalPaymentConfig
│   └── Passer paymentConfig à UsersValidatedTab
└── src/components/admin/tabs/UsersValidatedTab.tsx
    ├── Import PaymentBadge, PaymentMethodSelect
    ├── Ajouter prop paymentConfig
    ├── Calculer paidCount
    ├── Ajouter 5ème card stats
    ├── Ajouter section paiement dans cards joueurs
    └── Ajouter card info paiement
```

---

# 💡 NOTES IMPORTANTES

## Liaison avec la configuration globale

Les moyens de paiement affichés dans la dropdown sont **dynamiquement générés** à partir de `PaymentConfig` :
- Si un moyen est désactivé dans `/admin/inscriptions`, il n'apparaît pas dans la dropdown
- Le helper `getEnabledPaymentMethods` filtre uniquement les moyens `enabled: true`
- Les icônes et labels sont définis dans le helper pour cohérence

## Gestion du statut de paiement

- Quand un joueur est marqué "Payé" : `payment_status = true`, `payment_date = NOW()`
- Quand un joueur est marqué "Non payé" : `payment_status = false`, `payment_date = NULL`, `payment_method = NULL`
- Le moyen de paiement ne peut être sélectionné que si le joueur est marqué comme payé

## Performance

- Un index a été créé pour optimiser les requêtes filtrant par paiement
- Les changements se font via Server Actions avec `revalidatePath`
- La dropdown est contrôlée côté client pour meilleure UX

## UX/UI

- Badge vert (emerald) pour "Payé" → Cohérent avec "Validé"
- Badge rouge (rose) pour "Non payé" → Cohérent avec "Refusé"
- Dropdown désactivée et grisée si non payé
- Animation et feedback visuel sur les changements
- Card info explicative en bas

## Évolutions futures possibles

- Historique des paiements (table dédiée `payments`)
- Export CSV des paiements
- Notifications automatiques aux joueurs non payés
- Intégration avec Stripe/PayPal pour paiement en ligne

---

Bonne implémentation ! 🎾💰✅
