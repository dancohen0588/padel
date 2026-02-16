# Prompt - Liste d'attente pour les tournois

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

Ajouter une fonctionnalité de **liste d'attente** pour les tournois permettant de mettre des joueurs en attente plutôt que de les valider ou refuser immédiatement.

### Fonctionnalités

✅ **Onglet "À valider"** : Ajouter un bouton "⏳ Liste d'attente" à côté de "Valider" et "Refuser"
✅ **Onglet "Joueurs"** : Afficher une section dédiée aux joueurs en liste d'attente
✅ **Gestion d'ordre** : Les joueurs sont ordonnés par date d'ajout à la liste
✅ **Actions** : Valider un joueur depuis la liste d'attente ou le repasser en attente normale
✅ **Badge visuel** : Badge amber animé "Liste d'attente" avec position (#1, #2, etc.)

---

# 🗄️ PARTIE 1 : BASE DE DONNÉES

## 1.1 - Modification du schéma

La table `registrations` utilise déjà un champ `status` de type `registration_status`.

### Migration SQL à créer

```sql
-- Fichier : migrations/XXX_add_waitlist_status.sql

-- 1. Ajouter le nouveau statut 'waitlist' à l'enum existant
ALTER TYPE registration_status ADD VALUE IF NOT EXISTS 'waitlist';

-- 2. Ajouter une colonne pour tracker la date d'ajout à la waitlist
ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS waitlist_added_at TIMESTAMP;

-- 3. Index pour optimiser les requêtes de liste d'attente
CREATE INDEX IF NOT EXISTS idx_registrations_waitlist
ON registrations(tournament_id, status, waitlist_added_at)
WHERE status = 'waitlist';

-- 4. Commentaires
COMMENT ON COLUMN registrations.waitlist_added_at IS 'Date à laquelle le joueur a été mis en liste d''attente';
```

---

# 🔧 PARTIE 2 : TYPES TYPESCRIPT

## 2.1 - Mise à jour des types

### Fichier à modifier : `src/lib/types.ts`

```typescript
// Ajouter 'waitlist' au type RegistrationStatus
export type RegistrationStatus = "pending" | "approved" | "rejected" | "waitlist";

// Mettre à jour le type Registration pour inclure waitlist_added_at
export type Registration = {
  id: string;
  tournament_id: string;
  player_id: string;
  status: RegistrationStatus;
  registered_at: Date;
  waitlist_added_at: Date | null;  // ⬅️ AJOUTER
  // ... autres champs
};

export type RegistrationWithPlayer = Registration & {
  player: Player;
  hasJoinedWhatsApp?: boolean;
  whatsappJoinDate?: string | null;
};
```

---

# 📡 PARTIE 3 : BACKEND - Requêtes SQL

## 3.1 - Modifier les requêtes existantes

### Fichier à modifier : `src/lib/queries.ts`

**Fonction `getRegistrationsByStatus`** - Ajouter le champ `waitlist_added_at` :

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
      waitlist_added_at: string | null;  // ⬅️ AJOUTER
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
      r.waitlist_added_at::text,  -- ⬅️ AJOUTER
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
      waitlist_added_at: row.waitlist_added_at ? new Date(row.waitlist_added_at) : null,  // ⬅️ AJOUTER
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

**Fonction `countRegistrations`** - Ajouter le compteur de waitlist :

```typescript
export async function countRegistrations(
  tournamentId: string
): Promise<Record<RegistrationStatus, number>> {
  const results = await database<
    Array<{ status: RegistrationStatus; count: string }>
  >`
    SELECT status, COUNT(*)::text as count
    FROM registrations
    WHERE tournament_id = ${tournamentId}
    GROUP BY status
  `;

  return {
    pending: Number(results.find((r) => r.status === "pending")?.count ?? 0),
    approved: Number(results.find((r) => r.status === "approved")?.count ?? 0),
    rejected: Number(results.find((r) => r.status === "rejected")?.count ?? 0),
    waitlist: Number(results.find((r) => r.status === "waitlist")?.count ?? 0),  // ⬅️ AJOUTER
  };
}
```

---

# 🎬 PARTIE 4 : SERVER ACTIONS

## 4.1 - Modifier la Server Action existante

### Fichier à modifier : `src/app/actions/registrations.ts`

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { database } from "@/lib/database";
import { assertAdminToken } from "@/lib/admin";
import type { RegistrationStatus } from "@/lib/types";

export async function updateRegistrationStatusAction(formData: FormData) {
  const registrationId = formData.get("registrationId") as string;
  const status = formData.get("status") as RegistrationStatus;
  const adminToken = formData.get("adminToken") as string;

  if (!registrationId || !status) {
    throw new Error("Missing required fields");
  }

  try {
    assertAdminToken(adminToken);
  } catch {
    throw new Error("Invalid admin token");
  }

  // Si le statut est "waitlist", on met à jour waitlist_added_at
  if (status === "waitlist") {
    await database`
      UPDATE registrations
      SET
        status = ${status},
        waitlist_added_at = NOW()  -- ⬅️ IMPORTANT : Enregistrer l'heure d'ajout
      WHERE id = ${registrationId}
    `;
  } else {
    // Pour les autres statuts, on nettoie waitlist_added_at
    await database`
      UPDATE registrations
      SET
        status = ${status},
        waitlist_added_at = NULL
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
```

---

# 🎨 PARTIE 5 : FRONTEND - Composants

## 5.1 - Onglet "À valider" - Ajouter le bouton Liste d'attente

### Fichier à modifier : `src/components/admin/tabs/UsersApprovalTab.tsx`

**Dans la section des boutons d'action** (après le bouton "Valider", avant "Refuser") :

```tsx
{/* Bouton Valider - EXISTANT */}
<form
  action={async (formData) => {
    await updateRegistrationStatusAction(formData);
    router.refresh();
  }}
>
  <input type="hidden" name="registrationId" value={registration.id} />
  <input type="hidden" name="status" value="approved" />
  <input type="hidden" name="adminToken" value={adminToken} />
  <GradientButton type="submit">✓ Valider</GradientButton>
</form>

{/* Bouton Liste d'attente - ⬅️ NOUVEAU */}
<form
  action={async (formData) => {
    await updateRegistrationStatusAction(formData);
    router.refresh();
  }}
>
  <input type="hidden" name="registrationId" value={registration.id} />
  <input type="hidden" name="status" value="waitlist" />
  <input type="hidden" name="adminToken" value={adminToken} />
  <GradientButton
    type="submit"
    className="border-white/20 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30"
  >
    ⏳ Liste d'attente
  </GradientButton>
</form>

{/* Bouton Refuser - EXISTANT */}
<form
  action={async (formData) => {
    await updateRegistrationStatusAction(formData);
    router.refresh();
  }}
>
  <input type="hidden" name="registrationId" value={registration.id} />
  <input type="hidden" name="status" value="rejected" />
  <input type="hidden" name="adminToken" value={adminToken} />
  <GradientButton
    type="submit"
    className="bg-rose-500/20 text-rose-200 hover:bg-rose-500/30"
  >
    ✕ Refuser
  </GradientButton>
</form>
```

---

## 5.2 - Onglet "Joueurs" - Ajouter la section Liste d'attente

### Fichier à modifier : `src/components/admin/tabs/UsersValidatedTab.tsx`

**Ajouter le filtre des joueurs en liste d'attente** (après le `approved` useMemo) :

```typescript
const waitlist = useMemo(
  () =>
    registrations
      .filter((registration) => registration.status === "waitlist")
      .sort((a, b) => {
        // Trier par date d'ajout à la waitlist (plus ancien en premier)
        const dateA = a.waitlist_added_at?.getTime() ?? 0;
        const dateB = b.waitlist_added_at?.getTime() ?? 0;
        return dateA - dateB;
      }),
  [registrations]
);
```

**Ajouter la section waitlist APRÈS la grille des joueurs validés** :

```tsx
{/* Grille des joueurs validés - EXISTANTE */}
<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
  {/* ... contenu existant ... */}
</div>

{/* NOUVELLE SECTION - LISTE D'ATTENTE */}
{waitlist.length > 0 && (
  <div className="mt-12 space-y-4">
    {/* Separator avec titre */}
    <div className="flex items-center gap-4">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"></div>
      <div className="flex items-center gap-2 text-amber-300">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span className="text-lg font-semibold">Liste d'attente</span>
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"></div>
    </div>

    {/* Info card */}
    <Card className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-transparent p-4">
      <div className="flex items-start gap-3">
        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
        </svg>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-300">
            {waitlist.length} joueur{waitlist.length > 1 ? 's' : ''} en liste d'attente
          </p>
          <p className="mt-1 text-xs text-white/70">
            Ces joueurs seront automatiquement notifiés si des places se libèrent. Vous pouvez les valider manuellement à tout moment.
          </p>
        </div>
      </div>
    </Card>

    {/* Grille des joueurs en liste d'attente */}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {waitlist.map((registration, index) => {
        const rankingValue = registration.player.ranking?.toString().trim();
        const playPreferenceValue = registration.player.play_preference?.toString().trim();

        return (
          <Card
            key={registration.id}
            className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-5 text-white shadow-card"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-sm font-semibold text-amber-300">
                {buildInitials(
                  registration.player.first_name,
                  registration.player.last_name
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div className="space-y-1">
                  <p className="text-base font-semibold">
                    {registration.player.first_name} {registration.player.last_name}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-amber-200">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                    <span>Liste d'attente</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-white/70">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span>✉️</span>
                      <span>{registration.player.email ?? "N/A"}</span>
                    </div>
                    <WhatsAppBadge
                      hasJoined={Boolean(registration.hasJoinedWhatsApp)}
                      joinedAt={registration.whatsappJoinDate}
                    />
                  </div>
                  {registration.player.phone ? (
                    <div className="flex items-center gap-2">
                      <span>📱</span>
                      <span>{registration.player.phone}</span>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60">
                    <span>
                      Niveau :{" "}
                      {registration.player.level
                        ? LEVEL_LABELS[registration.player.level] ?? registration.player.level
                        : "N/A"}
                    </span>
                    <span>•</span>
                    <span>
                      Classement :{" "}
                      {rankingValue || "N/A"}
                    </span>
                    {playPreferenceValue && (
                      <>
                        <span>•</span>
                        <span>
                          Côté préféré :{" "}
                          {playPreferenceValue}
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span className="font-semibold text-amber-300">
                      Position : #{index + 1}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <form
                className="flex-1"
                action={async (formData) => {
                  await updateRegistrationStatusAction(formData);
                  router.refresh();
                }}
              >
                <input type="hidden" name="registrationId" value={registration.id} />
                <input type="hidden" name="status" value="approved" />
                <input type="hidden" name="adminToken" value={adminToken} />
                <GradientButton type="submit" className="w-full">
                  ✓ Valider maintenant
                </GradientButton>
              </form>
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
                  className="bg-white/10 text-white hover:bg-white/15"
                >
                  ↶ Attente
                </GradientButton>
              </form>
            </div>
          </Card>
        );
      })}
    </div>
  </div>
)}
```

---

## 5.3 - Composant Badge pour le statut Waitlist

### Fichier à modifier : `src/components/ui/status-badge.tsx`

**Ajouter le cas "waitlist"** dans le composant StatusBadge :

```typescript
export function StatusBadge({ status }: { status: RegistrationStatus }) {
  const config = {
    pending: {
      label: "En attente",
      color: "orange",
      classes: "border-orange-400/30 bg-orange-500/15 text-orange-300",
      dotClasses: "bg-orange-400",
    },
    approved: {
      label: "Validé",
      color: "green",
      classes: "border-emerald-400/30 bg-emerald-500/15 text-emerald-300",
      dotClasses: "bg-emerald-400",
    },
    rejected: {
      label: "Refusé",
      color: "red",
      classes: "border-rose-400/30 bg-rose-500/15 text-rose-300",
      dotClasses: "bg-rose-400",
    },
    waitlist: {  // ⬅️ AJOUTER
      label: "Liste d'attente",
      color: "amber",
      classes: "border-amber-400/30 bg-amber-500/15 text-amber-300",
      dotClasses: "bg-amber-400",
    },
  };

  const statusConfig = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusConfig.classes}`}
    >
      <span className={`h-2 w-2 rounded-full animate-pulse ${statusConfig.dotClasses}`} />
      {statusConfig.label}
    </span>
  );
}
```

---

# ✅ CHECKLIST COMPLÈTE

## Base de données
- [ ] Migration ajoutant le statut `waitlist` à l'enum `registration_status`
- [ ] Colonne `waitlist_added_at` ajoutée à la table `registrations`
- [ ] Index créé pour optimiser les requêtes de liste d'attente

## Backend
- [ ] Type `RegistrationStatus` mis à jour avec `"waitlist"`
- [ ] Type `Registration` mis à jour avec `waitlist_added_at`
- [ ] Fonction `getRegistrationsByStatus` mise à jour
- [ ] Fonction `countRegistrations` mise à jour
- [ ] Server Action `updateRegistrationStatusAction` mise à jour

## Frontend - Onglet "À valider"
- [ ] Bouton "⏳ Liste d'attente" ajouté entre "Valider" et "Refuser"
- [ ] Couleur amber pour le bouton waitlist
- [ ] Form avec status="waitlist"

## Frontend - Onglet "Joueurs"
- [ ] useMemo `waitlist` créé avec tri par date
- [ ] Section "Liste d'attente" ajoutée après les joueurs validés
- [ ] Séparateur visuel avec titre et gradients
- [ ] Card info amber avec compteur
- [ ] Grille des joueurs en waitlist avec border amber
- [ ] Badge "Liste d'attente" animé
- [ ] Indicateur de position (#1, #2, #3)
- [ ] Boutons "✓ Valider maintenant" et "↶ Attente"
- [ ] Badge WhatsApp intégré

## Frontend - Composant Badge
- [ ] Cas `waitlist` ajouté au composant `StatusBadge`
- [ ] Couleurs amber appliquées
- [ ] Animation pulse

---

# 🚀 ORDRE D'EXÉCUTION RECOMMANDÉ

1. **Migration SQL** → Créer et exécuter la migration
2. **Types** → Mettre à jour `src/lib/types.ts`
3. **Queries** → Modifier `src/lib/queries.ts`
4. **Server Action** → Mettre à jour `src/app/actions/registrations.ts`
5. **StatusBadge** → Ajouter le cas waitlist dans `src/components/ui/status-badge.tsx`
6. **UsersApprovalTab** → Ajouter le bouton dans `src/components/admin/tabs/UsersApprovalTab.tsx`
7. **UsersValidatedTab** → Ajouter la section dans `src/components/admin/tabs/UsersValidatedTab.tsx`
8. **Test** → Tester tous les cas (pending → waitlist, waitlist → approved, waitlist → pending)

---

# 🧪 TESTS MANUELS

## Flux de test

1. **Ajouter à la waitlist**
   - Aller dans l'onglet "À valider"
   - Cliquer sur "⏳ Liste d'attente" pour un joueur
   - Vérifier que le joueur disparaît de l'onglet "À valider"

2. **Vérifier l'onglet "Joueurs"**
   - Aller dans l'onglet "Joueurs"
   - Scroller en bas, vérifier la section "Liste d'attente"
   - Vérifier le badge amber animé
   - Vérifier la position (#1, #2, etc.)
   - Vérifier le badge WhatsApp

3. **Valider depuis la waitlist**
   - Cliquer sur "✓ Valider maintenant"
   - Vérifier que le joueur passe dans les joueurs validés
   - Vérifier que la position des autres se met à jour

4. **Repasser en attente normale**
   - Cliquer sur "↶ Attente" pour un joueur en waitlist
   - Vérifier qu'il repasse dans l'onglet "À valider"

## Cas limites

- [ ] Vérifier l'ordre de la liste d'attente (par date d'ajout)
- [ ] Vérifier avec 0 joueur en waitlist (section ne s'affiche pas)
- [ ] Vérifier avec 1 joueur en waitlist (singulier dans le texte)
- [ ] Vérifier avec plusieurs joueurs en waitlist (positions correctes)
- [ ] Vérifier le responsive sur mobile/tablet/desktop

---

# 📊 RÉCAPITULATIF DES FICHIERS

```
Fichiers à créer (1) :
└── migrations/XXX_add_waitlist_status.sql

Fichiers à modifier (6) :
├── src/lib/types.ts
│   └── Ajouter 'waitlist' à RegistrationStatus + waitlist_added_at
├── src/lib/queries.ts
│   ├── Modifier getRegistrationsByStatus (ajouter champ + tri)
│   └── Modifier countRegistrations (ajouter compteur waitlist)
├── src/app/actions/registrations.ts
│   └── Modifier updateRegistrationStatusAction (gérer waitlist_added_at)
├── src/components/ui/status-badge.tsx
│   └── Ajouter le cas 'waitlist' avec couleurs amber
├── src/components/admin/tabs/UsersApprovalTab.tsx
│   └── Ajouter le bouton "⏳ Liste d'attente"
└── src/components/admin/tabs/UsersValidatedTab.tsx
    ├── Ajouter useMemo waitlist avec tri
    └── Ajouter section complète avec grille
```

---

# 💡 NOTES IMPORTANTES

## Ordre de priorité dans la waitlist

Les joueurs sont ordonnés par **date d'ajout à la waitlist** (`waitlist_added_at`), du plus ancien au plus récent. Cela garantit un système FIFO (First In, First Out) équitable.

## Gestion du champ waitlist_added_at

- Quand un joueur passe en `waitlist` : `waitlist_added_at = NOW()`
- Quand un joueur quitte la waitlist (validé, refusé, ou repasse en attente) : `waitlist_added_at = NULL`

## Performance

- Un index a été créé pour optimiser les requêtes de liste d'attente
- Le tri est fait en SQL pour de meilleures performances
- La position est calculée côté frontend (index + 1)

## UX/UI

- Couleur amber pour la waitlist (différente du orange "pending", vert "approved", rouge "rejected")
- Animation pulse sur les badges pour attirer l'attention
- Section séparée visuellement dans l'onglet "Joueurs"
- Badge WhatsApp également présent pour les joueurs en waitlist

## Notifications (fonctionnalité future - optionnelle)

Pour notifier automatiquement les joueurs en waitlist quand des places se libèrent, il faudrait :
1. Créer un système de notification (email/SMS)
2. Trigger automatique quand un joueur validé se désinscrit
3. Prendre le premier joueur en waitlist et lui envoyer une notification

Cette fonctionnalité n'est pas incluse dans ce prompt mais peut être ajoutée ultérieurement.

---

Bonne implémentation ! 🎾⏳✅
