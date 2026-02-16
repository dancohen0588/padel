# Prompt - Implémentation WhatsApp pour Tournois de Padel

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

Implémenter un système de **groupe WhatsApp** pour les tournois permettant :

1. **Configuration Admin** : Ajouter un champ "Lien du groupe WhatsApp" dans le formulaire d'édition de tournoi
2. **Page de Confirmation** : Afficher un bloc WhatsApp avec :
   - Bouton "Rejoindre le groupe WhatsApp"
   - QR Code cliquable généré dynamiquement
   - Tracking en base de données du clic
   - Redirection vers le groupe WhatsApp

### Fonctionnalités clés

✅ **Admin** : Champ texte pour le lien WhatsApp dans `/admin/inscriptions`
✅ **Tracking** : Enregistrement de l'action "a rejoint WhatsApp" dans le profil joueur
✅ **QR Code** : Génération dynamique avec QRCode.js
✅ **Redirection** : Ouverture du lien WhatsApp dans un nouvel onglet
✅ **UX** : Feedback visuel (loading → success) sur le bouton

---

# 🗄️ PARTIE 1 : BASE DE DONNÉES

## 1.1 - Migration pour le Lien WhatsApp

### Fichier à créer : `database/migrations/004_add_whatsapp_to_tournaments.sql`

```sql
-- Migration: Ajout du lien WhatsApp aux tournois et tracking des clics

-- 1. Ajouter le champ whatsapp_group_link aux tournois
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS whatsapp_group_link TEXT;

COMMENT ON COLUMN public.tournaments.whatsapp_group_link IS 'Lien d''invitation au groupe WhatsApp du tournoi';

-- 2. Ajouter le tracking des clics WhatsApp aux joueurs
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS whatsapp_joined_tournaments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.players.whatsapp_joined_tournaments IS 'Liste des IDs de tournois pour lesquels le joueur a cliqué sur "Rejoindre WhatsApp"';

-- 3. Créer un index pour rechercher rapidement si un joueur a rejoint un groupe
CREATE INDEX IF NOT EXISTS idx_players_whatsapp_tournaments
ON public.players USING gin (whatsapp_joined_tournaments);
```

### Structure du tracking

Le champ `whatsapp_joined_tournaments` contient un tableau JSON d'objets :

```typescript
[
  {
    "tournamentId": "uuid-123",
    "joinedAt": "2024-03-15T14:30:00.000Z"
  },
  {
    "tournamentId": "uuid-456",
    "joinedAt": "2024-04-20T10:15:00.000Z"
  }
]
```

---

# 🔧 PARTIE 2 : TYPES

## 2.1 - Mise à Jour du Type Tournament

### Fichier à modifier : `src/lib/types.ts`

**Ajouter** le champ WhatsApp au type `Tournament` :

```typescript
export type Tournament = {
  // ... champs existants ...
  price: number | null;
  paymentConfig: PaymentConfig;
  whatsappGroupLink: string | null;  // ⬅️ AJOUTER
};
```

## 2.2 - Type pour le Tracking

**Ajouter** le type pour le tracking WhatsApp :

```typescript
export type WhatsAppJoin = {
  tournamentId: string;
  joinedAt: string;
};

export type Player = {
  // ... champs existants ...
  whatsappJoinedTournaments: WhatsAppJoin[];  // ⬅️ AJOUTER
};
```

---

# 👨‍💼 PARTIE 3 : INTERFACE ADMIN

## 3.1 - Ajouter le Champ dans TournamentsTab

### Fichier à modifier : `src/components/admin/tabs/TournamentsTab.tsx`

#### 3.1.1 - État local

**Ajouter** après les autres états (vers ligne 40) :

```typescript
const [whatsappLink, setWhatsappLink] = useState<string>("");
```

#### 3.1.2 - Initialisation dans useEffect

Dans le `useEffect` qui initialise les valeurs du formulaire (vers ligne 67-85), **ajouter** :

```typescript
setWhatsappLink(selected?.whatsappGroupLink ?? "");
```

#### 3.1.3 - Champ dans le formulaire

**Après** le champ "Prix d'inscription" (vers ligne 405), **ajouter** :

```tsx
<label className="flex flex-col gap-2 text-sm font-semibold text-brand-charcoal">
  Lien du groupe WhatsApp
  <div className="flex items-center gap-2">
    <span className="text-xl">💬</span>
    <Input
      name="whatsapp_group_link"
      type="url"
      placeholder="https://chat.whatsapp.com/XXXXX"
      value={whatsappLink}
      onChange={(event) => setWhatsappLink(event.target.value)}
      className="flex-1"
    />
  </div>
  <span className="text-xs text-muted-foreground">
    Laissez vide si vous ne souhaitez pas partager de groupe WhatsApp.
    Le lien doit être au format : https://chat.whatsapp.com/XXXXX
  </span>
</label>
```

---

## 3.2 - Mise à Jour de l'Action de Sauvegarde

### Fichier à modifier : `src/app/actions/tournaments.ts`

#### 3.2.1 - Extraire le lien WhatsApp

**Après** l'extraction du prix (vers ligne 70), **ajouter** :

```typescript
const whatsappGroupLink = getValue(formData, "whatsapp_group_link");
const whatsappLinkValue = whatsappGroupLink && whatsappGroupLink.trim() !== ""
  ? whatsappGroupLink.trim()
  : null;
```

#### 3.2.2 - Requête UPDATE

Dans la requête UPDATE (vers ligne 110), **ajouter** après `price` :

```typescript
await database`
  UPDATE tournaments
  SET
    slug = ${slug || null},
    name = ${name},
    date = ${date},
    location = ${location || null},
    description = ${description || null},
    status = ${status},
    max_players = ${maxPlayers || null},
    image_path = ${imagePath || null},
    price = ${priceValue},
    whatsapp_group_link = ${whatsappLinkValue},  // ⬅️ AJOUTER
    config = ${database.json(config)}
  WHERE id = ${tournamentId}
`;
```

#### 3.2.3 - Requête INSERT

Dans la requête INSERT (vers ligne 130), **ajouter** après `price` :

```typescript
const created = await database<Array<{ id: string }>>`
  INSERT INTO tournaments (
    slug, name, date, location, description, status,
    max_players, image_path, price, whatsapp_group_link, config
  )
  VALUES (
    ${slug || null},
    ${name},
    ${date},
    ${location || null},
    ${description || null},
    ${status},
    ${maxPlayers || null},
    ${imagePath || null},
    ${priceValue},
    ${whatsappLinkValue},  // ⬅️ AJOUTER
    ${database.json(config || DEFAULT_CONFIG)}
  )
  RETURNING id
`;
```

---

# 📝 PARTIE 4 : PAGE DE CONFIRMATION

## 4.1 - Composant WhatsAppGroupSection

### Fichier à créer : `src/components/registration/WhatsAppGroupSection.tsx`

```typescript
"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";

type WhatsAppGroupSectionProps = {
  whatsappGroupLink: string;
  playerId: string;
  tournamentId: string;
  hasAlreadyJoined: boolean;
};

export function WhatsAppGroupSection({
  whatsappGroupLink,
  playerId,
  tournamentId,
  hasAlreadyJoined,
}: WhatsAppGroupSectionProps) {
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(hasAlreadyJoined);
  const qrCodeRef = useRef<HTMLCanvasElement>(null);

  // Générer le QR Code au montage du composant
  useEffect(() => {
    if (qrCodeRef.current) {
      QRCode.toCanvas(
        qrCodeRef.current,
        whatsappGroupLink,
        {
          width: 180,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
          errorCorrectionLevel: "H",
        },
        (error) => {
          if (error) console.error("QR Code generation error:", error);
        }
      );
    }
  }, [whatsappGroupLink]);

  const handleJoinWhatsApp = async () => {
    setIsJoining(true);

    try {
      // 1. Enregistrer l'action en base de données
      const response = await fetch("/api/players/track-whatsapp-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          tournamentId,
        }),
      });

      if (response.ok) {
        setHasJoined(true);
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
    } finally {
      // 2. Rediriger vers WhatsApp (même en cas d'erreur de tracking)
      window.open(whatsappGroupLink, "_blank");
      setIsJoining(false);
    }
  };

  return (
    <div className="mb-8 rounded-xl border border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-600/5 p-6 backdrop-blur-sm">
      <div className="mb-5 text-center">
        <div className="mb-2 text-4xl">💬</div>
        <h3 className="text-xl font-bold text-white">
          Rejoignez le groupe WhatsApp !
        </h3>
        <p className="mt-2 text-sm text-white/70">
          Restez connecté avec les autres participants, recevez les dernières
          infos et organisez vos matchs
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 md:flex-row md:justify-center">
        {/* QR Code */}
        <div className="flex flex-col items-center">
          <div
            className="mb-3 inline-block cursor-pointer rounded-xl bg-white p-4"
            onClick={handleJoinWhatsApp}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleJoinWhatsApp();
              }
            }}
          >
            <canvas ref={qrCodeRef} />
          </div>
          <p className="text-xs text-white/50">Scannez avec votre téléphone</p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 md:flex-col">
          <div className="h-px w-12 bg-white/20 md:h-12 md:w-px"></div>
          <span className="text-xs font-semibold text-white/40">OU</span>
          <div className="h-px w-12 bg-white/20 md:h-12 md:w-px"></div>
        </div>

        {/* Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleJoinWhatsApp}
            disabled={isJoining}
            className="group flex items-center gap-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(37,211,102,0.3)] disabled:opacity-50"
          >
            {isJoining ? (
              <>
                <svg
                  className="h-6 w-6 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Ouverture...</span>
              </>
            ) : hasJoined ? (
              <>
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Groupe rejoint !</span>
              </>
            ) : (
              <>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                <span>Rejoindre le groupe</span>
                <svg
                  className="h-5 w-5 transition-transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </>
            )}
          </button>
          <p className="mt-3 text-xs text-white/50">
            Cliquez pour ouvrir WhatsApp
          </p>
        </div>
      </div>

      {/* Info Notice */}
      <div className="mt-6 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
        <span className="text-base">✅</span>
        <p className="text-xs text-emerald-200/90">
          <strong>Astuce :</strong> En rejoignant le groupe, vous pourrez
          échanger avec les organisateurs et les autres participants, partager
          vos disponibilités et recevoir les rappels importants.
        </p>
      </div>
    </div>
  );
}
```

### Installation de la dépendance QRCode

```bash
npm install qrcode
npm install --save-dev @types/qrcode
```

---

## 4.2 - API de Tracking

### Fichier à créer : `src/app/api/players/track-whatsapp-join/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/database";

type RequestBody = {
  playerId: string;
  tournamentId: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { playerId, tournamentId } = body;

    if (!playerId || !tournamentId) {
      return NextResponse.json(
        { success: false, error: "playerId et tournamentId requis" },
        { status: 400 }
      );
    }

    const database = getDatabaseClient();

    // Récupérer le tableau actuel
    const [player] = await database<
      Array<{ whatsapp_joined_tournaments: unknown }>
    >`
      SELECT whatsapp_joined_tournaments
      FROM players
      WHERE id = ${playerId}
    `;

    if (!player) {
      return NextResponse.json(
        { success: false, error: "Joueur introuvable" },
        { status: 404 }
      );
    }

    const currentJoins = (player.whatsapp_joined_tournaments as Array<{
      tournamentId: string;
      joinedAt: string;
    }>) || [];

    // Vérifier si déjà rejoint
    const alreadyJoined = currentJoins.some(
      (join) => join.tournamentId === tournamentId
    );

    if (alreadyJoined) {
      return NextResponse.json({ success: true, alreadyJoined: true });
    }

    // Ajouter la nouvelle entrée
    const updatedJoins = [
      ...currentJoins,
      {
        tournamentId,
        joinedAt: new Date().toISOString(),
      },
    ];

    // Mettre à jour en base
    await database`
      UPDATE players
      SET whatsapp_joined_tournaments = ${database.json(updatedJoins)}
      WHERE id = ${playerId}
    `;

    return NextResponse.json({ success: true, alreadyJoined: false });
  } catch (error) {
    console.error("[track-whatsapp-join] error", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
```

---

## 4.3 - Intégration dans la Page de Confirmation

### Fichier à créer/modifier : `src/app/tournaments/[slug]/register/success/page.tsx`

**Note** : Si ce fichier n'existe pas encore, créer la page de confirmation. Sinon, modifier la page existante.

```typescript
import { notFound, redirect } from "next/navigation";
import { getDatabaseClient } from "@/lib/database";
import { WhatsAppGroupSection } from "@/components/registration/WhatsAppGroupSection";
import type { Tournament } from "@/lib/types";

type PageProps = {
  params: {
    slug: string;
  };
  searchParams: {
    registration?: string;
    player?: string;
  };
};

export default async function RegistrationSuccessPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = params;
  const registrationId = searchParams.registration;
  const playerId = searchParams.player;

  if (!registrationId || !playerId) {
    redirect(`/tournaments/${slug}`);
  }

  const database = getDatabaseClient();

  // Récupérer les données du tournoi
  const [tournament] = await database<
    Array<{
      id: string;
      slug: string;
      name: string;
      date: string;
      location: string | null;
      price: number | null;
      max_players: number | null;
      whatsapp_group_link: string | null;
      current_participants: string;
    }>
  >`
    SELECT
      t.id,
      t.slug,
      t.name,
      t.date::text as date,
      t.location,
      t.price,
      t.max_players,
      t.whatsapp_group_link,
      COUNT(r.id)::text as current_participants
    FROM tournaments t
    LEFT JOIN registrations r ON r.tournament_id = t.id
    WHERE t.slug = ${slug}
    GROUP BY t.id
  `;

  if (!tournament) {
    notFound();
  }

  // Récupérer les infos du joueur et de l'inscription
  const [registration] = await database<
    Array<{
      player_id: string;
      player_first_name: string;
      player_last_name: string;
      player_phone: string;
      player_level: string | null;
      whatsapp_joined_tournaments: unknown;
    }>
  >`
    SELECT
      p.id as player_id,
      p.first_name as player_first_name,
      p.last_name as player_last_name,
      p.phone as player_phone,
      p.level as player_level,
      p.whatsapp_joined_tournaments
    FROM registrations r
    JOIN players p ON p.id = r.player_id
    WHERE r.id = ${registrationId} AND p.id = ${playerId}
  `;

  if (!registration) {
    redirect(`/tournaments/${slug}`);
  }

  // Vérifier si le joueur a déjà rejoint WhatsApp pour ce tournoi
  const whatsappJoins = (registration.whatsapp_joined_tournaments as Array<{
    tournamentId: string;
    joinedAt: string;
  }>) || [];
  const hasAlreadyJoined = whatsappJoins.some(
    (join) => join.tournamentId === tournament.id
  );

  const formattedDate = new Date(tournament.date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      {/* Success Message */}
      <div className="success-animation mb-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600">
          <svg
            className="h-10 w-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white">
          Inscription confirmée !
        </h1>
        <p className="mt-2 text-lg text-white/70">
          Vous êtes inscrit au tournoi{" "}
          <span className="font-semibold text-orange-400">
            {tournament.name}
          </span>
        </p>
      </div>

      {/* Participant Info Card */}
      <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-2xl font-bold text-white">
            {registration.player_first_name[0]}
            {registration.player_last_name[0]}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">
              {registration.player_first_name} {registration.player_last_name}
            </h2>
            <p className="text-sm text-white/60">{registration.player_phone}</p>
            {registration.player_level && (
              <p className="mt-1 text-xs text-white/50">
                Niveau {registration.player_level}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tournament Details */}
      <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Détails du tournoi
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-white/60">📅 Date</span>
            <span className="font-medium text-white">{formattedDate}</span>
          </div>
          {tournament.location && (
            <div className="flex items-center justify-between">
              <span className="text-white/60">📍 Lieu</span>
              <span className="font-medium text-white">
                {tournament.location}
              </span>
            </div>
          )}
          {tournament.price !== null && tournament.price > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-white/60">💰 Prix</span>
              <span className="font-medium text-white">
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                }).format(tournament.price)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-white/60">👥 Participants</span>
            <span className="font-medium text-white">
              {tournament.current_participants}
              {tournament.max_players ? ` / ${tournament.max_players}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Reminder (if price > 0) */}
      {tournament.price !== null && tournament.price > 0 && (
        <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="text-sm font-semibold text-amber-300">
                N'oubliez pas de régler votre inscription
              </h3>
              <p className="mt-1 text-xs text-amber-200/80">
                Votre inscription sera validée après réception du paiement dans
                les 48h. Consultez les moyens de paiement disponibles dans
                l'email de confirmation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Section */}
      {tournament.whatsapp_group_link && (
        <WhatsAppGroupSection
          whatsappGroupLink={tournament.whatsapp_group_link}
          playerId={playerId}
          tournamentId={tournament.id}
          hasAlreadyJoined={hasAlreadyJoined}
        />
      )}

      {/* Next Steps */}
      <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Prochaines étapes
        </h3>
        <div className="space-y-3">
          {tournament.price !== null && tournament.price > 0 && (
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-xs font-bold text-orange-400">
                1
              </div>
              <p className="text-sm text-white/80">
                <strong className="text-white">Effectuez votre paiement</strong>{" "}
                dans les 48h selon les modalités indiquées dans l'email de
                confirmation
              </p>
            </div>
          )}
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-xs font-bold text-orange-400">
              {tournament.price !== null && tournament.price > 0 ? "2" : "1"}
            </div>
            <p className="text-sm text-white/80">
              <strong className="text-white">
                Rejoignez le groupe WhatsApp
              </strong>{" "}
              pour rester informé et échanger avec les participants
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-xs font-bold text-orange-400">
              {tournament.price !== null && tournament.price > 0 ? "3" : "2"}
            </div>
            <p className="text-sm text-white/80">
              <strong className="text-white">Préparez votre matériel</strong> et
              rendez-vous le jour J 15 minutes avant le début
            </p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-center">
        <a
          href="/"
          className="rounded-lg border border-white/20 bg-white/5 px-8 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Retour à l'accueil
        </a>
      </div>
    </div>
  );
}
```

---

## 4.4 - Redirection après Inscription

### Fichier à modifier : `src/app/actions/registrations.ts`

Dans la fonction `registerForTournament`, **modifier** la redirection de succès pour inclure les paramètres :

```typescript
// Après l'insertion réussie de la registration
return {
  success: true,
  redirect: `/tournaments/${slug}/register/success?registration=${registrationId}&player=${playerId}`,
};
```

---

# 🎨 PARTIE 5 : STYLES & ANIMATIONS

## 5.1 - Styles globaux (optionnel)

Si nécessaire, **ajouter** dans `src/app/globals.css` :

```css
/* Animation pour la page de succès */
.success-animation {
  animation: scaleIn 0.5s ease-out;
}

@keyframes scaleIn {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
```

---

# ✅ CHECKLIST COMPLÈTE

## Base de données

- [ ] Migration 004 exécutée
- [ ] Colonne `whatsapp_group_link` existe dans `tournaments`
- [ ] Colonne `whatsapp_joined_tournaments` existe dans `players`
- [ ] Index GIN créé pour la recherche

## Types

- [ ] Type `Tournament` mis à jour avec `whatsappGroupLink`
- [ ] Type `WhatsAppJoin` créé
- [ ] Type `Player` mis à jour

## Admin

- [ ] Champ WhatsApp ajouté dans `TournamentsTab.tsx`
- [ ] État `whatsappLink` initialisé correctement
- [ ] Action `upsertTournamentAction` gère le lien WhatsApp (INSERT + UPDATE)

## API

- [ ] Route `/api/players/track-whatsapp-join/route.ts` créée
- [ ] Validation des paramètres fonctionnelle
- [ ] Évite les doublons dans le tracking
- [ ] Retourne les bons codes de statut

## Composant WhatsApp

- [ ] `WhatsAppGroupSection.tsx` créé
- [ ] Dépendance `qrcode` installée
- [ ] QR Code généré au montage
- [ ] QR Code cliquable
- [ ] Bouton avec états (idle, loading, success)
- [ ] Tracking déclenché avant redirection
- [ ] Redirection vers WhatsApp fonctionnelle

## Page de Confirmation

- [ ] Page `/tournaments/[slug]/register/success/page.tsx` créée ou modifiée
- [ ] Récupération des données du tournoi
- [ ] Récupération des données du joueur
- [ ] Vérification si déjà rejoint WhatsApp
- [ ] Section WhatsApp affichée si lien configuré
- [ ] Prochaines étapes numérotées correctement

## Redirection

- [ ] Action `registerForTournament` redirige avec paramètres `registration` et `player`

---

# 🚀 ORDRE D'EXÉCUTION RECOMMANDÉ

1. **Migration 004** → Exécuter la migration SQL
2. **Types** → Ajouter les types dans `src/lib/types.ts`
3. **Dépendance** → `npm install qrcode @types/qrcode`
4. **Admin** → Modifier `TournamentsTab.tsx`
5. **Action** → Modifier `tournaments.ts` (INSERT + UPDATE)
6. **API** → Créer `/api/players/track-whatsapp-join/route.ts`
7. **Composant** → Créer `WhatsAppGroupSection.tsx`
8. **Page** → Créer/modifier `success/page.tsx`
9. **Redirection** → Modifier `registrations.ts`
10. **Test complet** → Vérifier tout le flow

---

# 🧪 TESTS MANUELS

## Configuration Admin

1. **Ouvrir** `/admin/inscriptions`
2. **Sélectionner** un tournoi
3. **Ajouter** un lien WhatsApp : `https://chat.whatsapp.com/TEST123`
4. **Sauvegarder** → Pas d'erreur
5. **Rafraîchir** → Lien toujours présent
6. **Vider** le champ → Sauvegarde à NULL fonctionnelle

## Page de Confirmation

1. **S'inscrire** à un tournoi avec lien WhatsApp
2. **Vérifier** affichage du bloc WhatsApp
3. **Scanner** le QR Code avec téléphone → Redirection OK
4. **Cliquer** sur le bouton → Animation loading → Redirection
5. **Vérifier** en base : tracking enregistré
6. **Rafraîchir** la page → Bouton affiche "Groupe rejoint !"
7. **Tournoi sans lien** → Bloc WhatsApp absent

## Tracking

1. **Vérifier** en base de données :
```sql
SELECT
  first_name,
  last_name,
  whatsapp_joined_tournaments
FROM players
WHERE id = 'player-uuid';
```
2. **Vérifier** structure JSON correcte
3. **Cliquer** plusieurs fois → Pas de doublon

---

# 📊 RÉCAPITULATIF DES FICHIERS

```
Fichiers à créer (3) :
├── database/migrations/004_add_whatsapp_to_tournaments.sql
├── src/components/registration/WhatsAppGroupSection.tsx
├── src/app/api/players/track-whatsapp-join/route.ts
└── src/app/tournaments/[slug]/register/success/page.tsx (si n'existe pas)

Fichiers à modifier (4) :
├── src/lib/types.ts
├── src/components/admin/tabs/TournamentsTab.tsx
├── src/app/actions/tournaments.ts
└── src/app/actions/registrations.ts

Dépendance à installer :
└── npm install qrcode @types/qrcode
```

---

# 💡 NOTES IMPORTANTES

## Format du Lien WhatsApp

Le lien doit être au format : `https://chat.whatsapp.com/XXXXXXXXXXXXX`

Les liens WhatsApp peuvent être obtenus via :
- WhatsApp Business → Outils → Lien de groupe
- WhatsApp Desktop → Infos du groupe → Inviter via un lien

## Tracking des Clics

- Le tracking est **optionnel** pour la redirection (l'utilisateur est redirigé même si le tracking échoue)
- Les doublons sont **automatiquement évités** (vérification avant insertion)
- L'état `hasJoined` permet d'afficher un feedback visuel permanent

## Comportement du QR Code

- Généré côté client avec `qrcode` (Canvas API)
- **Cliquable** en plus d'être scannable
- Niveau de correction d'erreur : **H** (High) pour une meilleure lisibilité même si partiellement masqué

## Affichage Conditionnel

Le bloc WhatsApp s'affiche uniquement si :
- `tournament.whatsappGroupLink !== null` **ET**
- `tournament.whatsappGroupLink !== ""`

## Accessibilité

- QR Code navigable au clavier (tabIndex, onKeyDown)
- Bouton avec états disabled appropriés
- Feedback visuel clair (animations, couleurs)

---

Bonne implémentation ! 🎾💬
