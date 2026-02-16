# Prompt Complet - Améliorations Application Tournois de Padel

## 📋 Contexte du Projet

**Projet** : Application Next.js 14+ (App Router) de gestion de tournois de padel
**Base de données** : PostgreSQL avec SQL direct (pas de Prisma)
**Stack technique** :
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- PostgreSQL
- Server Actions

## 🎯 Objectifs Globaux

Ce prompt couvre **deux grandes fonctionnalités** à implémenter :

### 🔐 Partie A : Nouveau Système d'Inscription
1. Remplacer l'**email par le téléphone** comme identifiant unique
2. Rendre l'**email optionnel**
3. Ajouter un **questionnaire** avec 3 questions (niveau 1-7, classement padel, préférence de jeu)
4. Supporter **6 formats différents** de numéros de téléphone français

### 💰 Partie B : Ajout du Prix des Tournois
1. Ajouter un champ **Prix** dans l'administration des tournois
2. Afficher le **prix sur les cards** de la home page
3. Gérer les tournois **gratuits** et **sans prix défini**

---

# 🗄️ PARTIE A : NOUVEAU SYSTÈME D'INSCRIPTION

## A.1 - Migration Base de Données (Joueurs)

### Fichier à créer : `database/migrations/001_phone_as_identifier.sql`

```sql
-- Migration: Phone as primary identifier instead of email

-- 1. Ajouter les nouveaux champs au modèle Player
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS is_ranked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ranking TEXT,
  ADD COLUMN IF NOT EXISTS play_preference TEXT CHECK (play_preference IN ('droite', 'gauche', 'aucune'));

-- 2. Modifier la colonne email pour la rendre nullable
ALTER TABLE public.players
  ALTER COLUMN email DROP NOT NULL;

-- 3. Modifier la colonne phone pour la rendre obligatoire
-- ATTENTION: Si des données existantes n'ont pas de téléphone, il faut d'abord les nettoyer
UPDATE public.players SET phone = 'migration-' || id::text WHERE phone IS NULL OR phone = '';
ALTER TABLE public.players
  ALTER COLUMN phone SET NOT NULL;

-- 4. Supprimer l'ancien index unique sur email
DROP INDEX IF EXISTS idx_players_email_unique;

-- 5. Créer un index unique sur le téléphone normalisé
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_phone_unique
ON public.players (
  CASE
    WHEN phone ~ '^\+33' THEN '0' || regexp_replace(substring(phone from 4), '[^0-9]', '', 'g')
    ELSE regexp_replace(phone, '[^0-9]', '', 'g')
  END
);

-- 6. Créer un index partiel sur email pour les emails non nuls
CREATE INDEX IF NOT EXISTS idx_players_email_partial
ON public.players (lower(email))
WHERE email IS NOT NULL;

-- 7. Mettre à jour la vue player_stats pour inclure les nouveaux champs
DROP VIEW IF EXISTS public.player_stats;

CREATE VIEW public.player_stats AS
SELECT
  p.id as player_id,
  p.first_name,
  p.last_name,
  p.email,
  p.phone,
  p.level,
  p.is_ranked,
  p.ranking,
  p.play_preference,
  count(r.id) as tournaments_played,
  count(*) filter (where r.status = 'approved') as approved_registrations,
  max(r.registered_at) as last_registered_at
FROM public.players p
LEFT JOIN public.registrations r on r.player_id = p.id
GROUP BY p.id;
```

---

## A.2 - Fonction Utilitaire de Normalisation du Téléphone

### Fichier à créer : `src/lib/phone-utils.ts`

```typescript
/**
 * Normalise un numéro de téléphone français vers le format E.164 (+33XXXXXXXXX)
 *
 * Formats acceptés :
 * - 0XXXXXXXXX
 * - 0X.XX.XX.XX.XX
 * - 0X XX XX XX XX
 * - +33XXXXXXXXX
 * - +33X.XX.XX.XX.XX
 * - +33X XX XX XX XX
 */
export function normalizePhoneNumber(phone: string): string | null {
  // Enlever tous les caractères non-numériques sauf le +
  let cleaned = phone.trim().replace(/[^\d+]/g, '');

  // Cas 1: Le numéro commence par +33
  if (cleaned.startsWith('+33')) {
    const digits = cleaned.substring(3);
    if (digits.length === 9) {
      return '+33' + digits;
    }
    return null;
  }

  // Cas 2: Le numéro commence par 33 (sans +)
  if (cleaned.startsWith('33') && cleaned.length === 11) {
    return '+' + cleaned;
  }

  // Cas 3: Le numéro commence par 0 (format français classique)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '+33' + cleaned.substring(1);
  }

  // Cas 4: 9 chiffres sans indicatif
  if (cleaned.length === 9 && !cleaned.startsWith('0')) {
    return '+33' + cleaned;
  }

  return null;
}

/**
 * Valide si un numéro de téléphone est au bon format
 */
export function isValidPhoneNumber(phone: string): boolean {
  return normalizePhoneNumber(phone) !== null;
}

/**
 * Formate un numéro de téléphone pour l'affichage
 * Exemple: +33612345678 → 06 12 34 56 78
 */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return phone;

  const digits = '0' + normalized.substring(3);
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ');
}
```

---

## A.3 - Modifier le Composant RegistrationForm

### Fichier à modifier : `src/app/inscription/registration-form.tsx`

**Note** : Ce fichier contient beaucoup de code. Voici les modifications clés à apporter.

### A.3.1 - Imports

Ajouter l'import des utilitaires de téléphone :

```typescript
import { normalizePhoneNumber, isValidPhoneNumber, formatPhoneForDisplay } from "@/lib/phone-utils";
```

### A.3.2 - États

**Remplacer** les états liés à l'email par le téléphone :

```typescript
// AVANT (à supprimer)
const [email, setEmail] = useState("");
const [emailStatus, setEmailStatus] = useState<"idle" | "success" | "error">("idle");
const [emailMessage, setEmailMessage] = useState<string | null>(null);

// APRÈS (à ajouter)
const [phone, setPhone] = useState("");
const [phoneStatus, setPhoneStatus] = useState<"idle" | "success" | "error">("idle");
const [phoneMessage, setPhoneMessage] = useState<string | null>(null);
```

**Ajouter** l'état pour le questionnaire :

```typescript
const [isRanked, setIsRanked] = useState(false);
```

### A.3.3 - Type VerifiedPlayer

**Mettre à jour** le type :

```typescript
type VerifiedPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;      // ⬅️ Maintenant nullable
  phone: string;              // ⬅️ Ajouté
  photoUrl: string | null;
  level: string | null;
  isRanked: boolean;          // ⬅️ Ajouté
  ranking: string | null;     // ⬅️ Ajouté
  playPreference: string | null; // ⬅️ Ajouté
  tournamentsPlayed: number;
};
```

### A.3.4 - Labels de Niveau

**Remplacer** les labels de niveau :

```typescript
// AVANT (à supprimer)
const LEVEL_LABELS: Record<string, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
  expert: "Expert",
};

// APRÈS (à ajouter)
const LEVEL_LABELS: Record<string, string> = {
  "1": "1 - Débutant",
  "2": "2 - Débutant confirmé",
  "3": "3 - Intermédiaire",
  "4": "4 - Intermédiaire confirmé",
  "5": "5 - Confirmé",
  "6": "6 - Avancé",
  "7": "7 - Expert",
};
```

### A.3.5 - Fonction de vérification

**Remplacer** `handleVerifyEmail` par `handleVerifyPhone` :

```typescript
const handleVerifyPhone = async () => {
  const trimmedPhone = phone.trim();
  if (!trimmedPhone) {
    setPhoneStatus("error");
    setPhoneMessage("Veuillez entrer un numéro de téléphone valide");
    return;
  }

  const normalizedPhone = normalizePhoneNumber(trimmedPhone);
  if (!normalizedPhone) {
    setPhoneStatus("error");
    setPhoneMessage("Format de téléphone invalide. Utilisez : 06 12 34 56 78 ou +33 6 12 34 56 78");
    return;
  }

  if (!tournamentId) {
    setPhoneStatus("error");
    setPhoneMessage("Tournoi introuvable.");
    return;
  }

  setIsVerifying(true);
  setPhoneStatus("idle");
  setPhoneMessage(null);

  try {
    const response = await fetch(
      `/api/tournaments/${tournamentId}/verify-phone`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone }),
      }
    );

    const payload = (await response.json()) as
      | { success: true; player: VerifiedPlayer }
      | { success: false; error: string };

    if (!response.ok || !payload.success) {
      setPhoneStatus("error");
      setPhoneMessage(
        payload.success
          ? "✗ Aucun compte trouvé avec ce numéro. Vérifiez votre numéro ou inscrivez-vous comme nouveau participant."
          : payload.error
      );
      setVerifiedPlayer(null);
      return;
    }

    setVerifiedPlayer(payload.player);
    setPhoneStatus("success");
    setPhoneMessage(
      `✓ Compte trouvé : ${payload.player.firstName} ${payload.player.lastName}. Confirmez pour vous inscrire à ce tournoi.`
    );
  } catch (error) {
    console.error("verify-phone error", error);
    setPhoneStatus("error");
    setPhoneMessage("Erreur serveur.");
    setVerifiedPlayer(null);
  } finally {
    setIsVerifying(false);
  }
};
```

### A.3.6 - Mise à jour du JSX

#### Message informatif (mode "existing")

**Remplacer** le message qui parle d'email par téléphone :

```tsx
{mode === "existing" ? (
  <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
    ℹ️ Utilisez le numéro de téléphone de votre première inscription pour
    retrouver votre compte et compiler vos statistiques.
  </div>
) : null}
```

#### Champ Téléphone (obligatoire)

**Remplacer** le champ email par téléphone au début du formulaire :

```tsx
{/* Téléphone (Obligatoire) */}
<div>
  <label className="mb-2 block text-sm font-medium text-white/80">
    Numéro de téléphone <span className="text-orange-400">*</span>
  </label>
  <input
    name="phone"
    placeholder="06 12 34 56 78 ou +33 6 12 34 56 78"
    type="tel"
    value={phone}
    onChange={(event) => setPhone(event.target.value)}
    required
    readOnly={mode === "existing" && Boolean(verifiedPlayer)}
    aria-describedby="phone-message"
    className={`w-full rounded-lg border px-4 py-3 text-base text-white transition ${
      mode === "existing"
        ? "border-orange-500/60 bg-orange-50/10"
        : "border-white/20 bg-white/5"
    } ${
      phoneStatus === "error"
        ? "border-red-500/60"
        : phoneStatus === "success"
          ? "border-emerald-500/60"
          : ""
    } ${mode === "existing" ? "text-lg" : ""} placeholder:text-white/40`}
  />
  {phoneMessage ? (
    <div
      id="phone-message"
      className={`mt-3 rounded-lg border px-4 py-3 text-sm ${
        phoneStatus === "error"
          ? "border-red-500/30 bg-red-500/10 text-red-300"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      }`}
    >
      {phoneMessage}
    </div>
  ) : null}
  <p className="mt-2 text-xs text-white/50">
    Formats acceptés : 06.12.34.56.78, 06 12 34 56 78, 0612345678, +33 6 12 34 56 78
  </p>
</div>
```

#### Champ Email (maintenant optionnel)

**Dans le bloc `{mode === "new" ? (...)}`**, après les champs Prénom/Nom, **ajouter** :

```tsx
{/* Email (Optionnel) */}
<div>
  <label className="mb-2 block text-sm font-medium text-white/80">
    Email <span className="text-xs text-white/50">(optionnel)</span>
  </label>
  <input
    name="email"
    placeholder="votre@email.com"
    type="email"
    className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40"
  />
  <p className="mt-2 text-xs text-white/50">
    L'email est facultatif mais recommandé pour recevoir les notifications.
  </p>
</div>
```

#### Questionnaire complet

**Remplacer** l'ancien champ "Niveau" par le questionnaire complet :

```tsx
{/* QUESTIONNAIRE */}
<div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5 space-y-5">
  <h3 className="text-sm font-semibold text-orange-400 mb-4">
    📋 Questionnaire
  </h3>

  {/* Question 1: Niveau 1-7 */}
  <div>
    <label className="mb-2 block text-sm font-medium text-white/80">
      Quel est votre niveau ? <span className="text-orange-400">*</span>
    </label>
    <select
      name="level"
      required
      className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-base text-white"
      defaultValue=""
    >
      <option value="" disabled>Sélectionnez votre niveau</option>
      <option value="1">1 - Débutant</option>
      <option value="2">2 - Débutant confirmé</option>
      <option value="3">3 - Intermédiaire</option>
      <option value="4">4 - Intermédiaire confirmé</option>
      <option value="5">5 - Confirmé</option>
      <option value="6">6 - Avancé</option>
      <option value="7">7 - Expert</option>
    </select>
    <p className="mt-2 text-xs text-white/50">
      1 = Débutant | 7 = Expert
    </p>
  </div>

  {/* Question 2: Classement Padel */}
  <div>
    <label className="mb-2 block text-sm font-medium text-white/80">
      Êtes-vous classé au padel ? <span className="text-orange-400">*</span>
    </label>
    <div className="flex gap-4 mb-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name="isRanked"
          value="non"
          checked={!isRanked}
          onChange={() => setIsRanked(false)}
          className="h-4 w-4 accent-orange-500"
        />
        <span className="text-sm text-white">Non</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name="isRanked"
          value="oui"
          checked={isRanked}
          onChange={() => setIsRanked(true)}
          className="h-4 w-4 accent-orange-500"
        />
        <span className="text-sm text-white">Oui</span>
      </label>
    </div>

    {/* Champ conditionnel */}
    {isRanked ? (
      <div className="mt-3">
        <label className="mb-2 block text-sm font-medium text-white/80">
          Votre classement <span className="text-orange-400">*</span>
        </label>
        <input
          name="ranking"
          type="text"
          placeholder="Ex: P500, P1000, 15/1, 15/2..."
          required={isRanked}
          className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40"
        />
      </div>
    ) : null}
  </div>

  {/* Question 3: Préférence de jeu */}
  <div>
    <label className="mb-2 block text-sm font-medium text-white/80">
      Avez-vous une préférence ? <span className="text-orange-400">*</span>
    </label>
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 cursor-pointer transition hover:bg-white/10">
        <input type="radio" name="playPreference" value="droite" required className="h-4 w-4 accent-orange-500" />
        <span className="text-sm text-white">Jouer à droite</span>
      </label>
      <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 cursor-pointer transition hover:bg-white/10">
        <input type="radio" name="playPreference" value="gauche" required className="h-4 w-4 accent-orange-500" />
        <span className="text-sm text-white">Jouer à gauche</span>
      </label>
      <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 cursor-pointer transition hover:bg-white/10">
        <input type="radio" name="playPreference" value="aucune" defaultChecked required className="h-4 w-4 accent-orange-500" />
        <span className="text-sm text-white">Pas de préférence</span>
      </label>
    </div>
  </div>
</div>
```

#### Boutons de vérification

**Remplacer** les appels à `handleVerifyEmail` par `handleVerifyPhone` :

```tsx
{mode === "existing" && !verifiedPlayer && phoneStatus !== "error" ? (
  <div className="flex gap-3">
    <button
      type="button"
      onClick={handleVerifyPhone}
      disabled={isVerifying}
      className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(255,107,53,0.3)] disabled:opacity-50"
    >
      {isVerifying ? "Vérification..." : "Vérifier mon compte"}
    </button>
  </div>
) : null}
```

#### Carte du joueur vérifié

**Mettre à jour** pour afficher le téléphone au lieu de l'email :

```tsx
{mode === "existing" && verifiedPlayer ? (
  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
    <div className="flex items-center gap-4">
      {/* ... avatar ... */}
      <div>
        <p className="text-lg font-semibold text-white">
          {verifiedPlayer.firstName} {verifiedPlayer.lastName}
        </p>
        <p className="text-sm text-white/60">{formatPhoneForDisplay(verifiedPlayer.phone)}</p>
        {verifiedPlayer.email ? (
          <p className="text-xs text-white/50">{verifiedPlayer.email}</p>
        ) : null}
      </div>
    </div>
    {/* ... stats ... */}
  </div>
) : null}
```

### A.3.7 - Fonction enhancedAction

**Mettre à jour** pour normaliser le téléphone :

```typescript
const enhancedAction = async (
  prevState: RegistrationResult | null,
  formData: FormData
) => {
  if (playerPhoto) {
    formData.set("player_photo", playerPhoto);
  }

  formData.set("mode", mode);
  if (mode === "existing" && verifiedPlayer) {
    formData.set("playerId", verifiedPlayer.id);
    formData.set("phone", verifiedPlayer.phone);
  } else if (mode === "new") {
    // Normaliser le téléphone avant envoi
    const rawPhone = String(formData.get("phone") ?? "").trim();
    const normalizedPhone = normalizePhoneNumber(rawPhone);
    if (normalizedPhone) {
      formData.set("phone", normalizedPhone);
    }
  }

  return action(prevState, formData);
};
```

---

## A.4 - Créer l'API de Vérification du Téléphone

### Fichier à créer : `src/app/api/tournaments/[id]/verify-phone/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/database";
import { normalizePhoneNumber } from "@/lib/phone-utils";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const tournamentId = params.id;
    const body = (await request.json()) as { phone?: string };
    const rawPhone = String(body?.phone ?? "").trim();

    if (!tournamentId) {
      return NextResponse.json(
        { success: false, error: "Tournoi introuvable." },
        { status: 400 }
      );
    }

    if (!rawPhone) {
      return NextResponse.json(
        { success: false, error: "Veuillez entrer un numéro de téléphone valide" },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhoneNumber(rawPhone);
    if (!normalizedPhone) {
      return NextResponse.json(
        {
          success: false,
          error: "Format de téléphone invalide. Utilisez : 06 12 34 56 78 ou +33 6 12 34 56 78"
        },
        { status: 400 }
      );
    }

    const database = getDatabaseClient();

    const [player] = await database<
      Array<{
        id: string;
        first_name: string;
        last_name: string;
        email: string | null;
        phone: string;
        photo_url: string | null;
        level: string | null;
        is_ranked: boolean | null;
        ranking: string | null;
        play_preference: string | null;
        tournaments_played: number | null;
      }>
    >`
      select
        p.id,
        p.first_name,
        p.last_name,
        p.email,
        p.phone,
        p.photo_url,
        p.level,
        p.is_ranked,
        p.ranking,
        p.play_preference,
        ps.tournaments_played
      from players p
      left join player_stats ps on ps.player_id = p.id
      where CASE
        WHEN p.phone ~ '^\\+33' THEN '0' || regexp_replace(substring(p.phone from 4), '[^0-9]', '', 'g')
        ELSE regexp_replace(p.phone, '[^0-9]', '', 'g')
      END = ${normalizedPhone.replace(/^\+33/, '0').replace(/\D/g, '')}
      limit 1
    `;

    if (!player) {
      return NextResponse.json(
        {
          success: false,
          error:
            "✗ Aucun compte trouvé avec ce numéro. Vérifiez votre numéro ou inscrivez-vous comme nouveau participant.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      player: {
        id: player.id,
        firstName: player.first_name,
        lastName: player.last_name,
        email: player.email,
        phone: player.phone,
        photoUrl: player.photo_url,
        level: player.level,
        isRanked: player.is_ranked ?? false,
        ranking: player.ranking,
        playPreference: player.play_preference,
        tournamentsPlayed: player.tournaments_played ?? 0,
      },
    });
  } catch (error) {
    console.error("[verify-phone] error", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur." },
      { status: 500 }
    );
  }
}
```

---

## A.5 - Actions de Registration (déjà implémenté)

**Note** : Le fichier `src/app/actions/registrations.ts` a déjà été modifié avec le nouveau système de téléphone. Vérifier que les modifications suivantes sont présentes :

- Import de `normalizePhoneNumber`
- Fonction `normalizePhone`
- Fonction `createPlayer` avec les nouveaux champs
- Fonction `registerForTournament` qui utilise le téléphone
- Gestion des nouveaux champs du questionnaire

---

# 💰 PARTIE B : AJOUT DU PRIX DES TOURNOIS

## B.1 - Migration Base de Données (Tournois)

### Fichier à créer : `database/migrations/002_add_price_to_tournaments.sql`

```sql
-- Migration: Ajout du champ prix aux tournois

-- Ajouter la colonne price
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);

-- Commenter pour la documentation
COMMENT ON COLUMN public.tournaments.price IS 'Prix d''inscription au tournoi en euros';

-- Contrainte pour prix positif ou nul
ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_price_positive CHECK (price IS NULL OR price >= 0);
```

---

## B.2 - Mise à Jour du Type Tournament

### Fichier à modifier : `src/lib/types.ts`

Localiser le type `Tournament` et **ajouter** :

```typescript
export type Tournament = {
  // ... champs existants ...
  price: number | null;  // ⬅️ AJOUTER CETTE LIGNE
};
```

---

## B.3 - Action de Sauvegarde du Tournoi

### Fichier à modifier : `src/app/actions/tournaments.ts`

### B.3.1 - Extraire le prix

**Après la ligne 48** (après `imagePath`), **ajouter** :

```typescript
const price = getValue(formData, "price");
const priceValue = price !== null && price !== "" ? Number(price) : null;
```

### B.3.2 - Requête UPDATE

Dans la requête UPDATE (vers ligne 95-107), **ajouter** après `image_path` :

```typescript
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
    price = ${priceValue},                    // ⬅️ AJOUTER
    config = ${database.json(config)}
  where id = ${tournamentId}
`;
```

### B.3.3 - Requête INSERT

Dans la requête INSERT (vers ligne 114-127), **modifier** :

```typescript
const created = await database<Array<{ id: string }>>`
  insert into tournaments (slug, name, date, location, description, status, max_players, image_path, price, config)
  values (
    ${slug || null},
    ${name},
    ${date},
    ${location || null},
    ${description || null},
    ${status},
    ${maxPlayers || null},
    ${imagePath || null},
    ${priceValue},                            // ⬅️ AJOUTER
    ${database.json(config || DEFAULT_CONFIG)}
  )
  returning id
`;
```

---

## B.4 - Formulaire Admin des Tournois

### Fichier à modifier : `src/components/admin/tabs/TournamentsTab.tsx`

### B.4.1 - État local

**Après la ligne 38**, **ajouter** :

```typescript
const [priceValue, setPriceValue] = useState<string>("");
```

### B.4.2 - Initialisation

Dans le `useEffect` (vers ligne 67-80), **après** `setImagePreview`, **ajouter** :

```typescript
setPriceValue(selected?.price !== null && selected?.price !== undefined ? String(selected.price) : "");
```

### B.4.3 - Champ dans le formulaire

**Après le champ "Lieu"** (vers ligne 389), **ajouter** :

```tsx
<label className="flex flex-col gap-2 text-sm font-semibold text-brand-charcoal">
  Prix d'inscription (€)
  <Input
    name="price"
    type="number"
    step="0.01"
    min="0"
    placeholder="Ex: 25.00"
    value={priceValue}
    onChange={(event) => setPriceValue(event.target.value)}
  />
  <span className="text-xs text-muted-foreground">
    Laissez vide pour un tournoi gratuit ou sans prix défini
  </span>
</label>
```

---

## B.5 - Affichage sur la Home Page

### B.5.1 - Requête SQL

### Fichier à modifier : `src/app/page.tsx`

Dans la requête des tournois à venir (vers ligne 49-76), **ajouter** `price` :

```typescript
database<
  Array<{
    // ... types existants ...
    price: number | null;              // ⬅️ AJOUTER
  }>
>`
  select
    t.id,
    t.slug,
    t.name,
    t.date::text as date,
    t.location,
    t.status,
    t.max_players as max_participants,
    t.price,                             // ⬅️ AJOUTER
    count(r.id)::text as current_participants
  from tournaments t
  left join registrations r on r.tournament_id = t.id
  where t.status in ('upcoming', 'registration', 'ongoing')
  group by t.id, t.slug, t.name, t.date, t.location, t.status, t.max_players, t.price  -- ⬅️ AJOUTER t.price
  order by t.date asc
  limit 3
`,
```

### B.5.2 - Mapping des données

**Après la ligne 100**, dans le mapping, **ajouter** :

```typescript
const upcomingTournaments = upcomingRows.map((row) => ({
  // ... champs existants ...
  price: row.price,                    // ⬅️ AJOUTER
}));
```

### B.5.3 - Composant UpcomingTournaments

### Fichier à modifier : `src/components/home/UpcomingTournaments.tsx`

#### Type

**Ajouter** le prix au type (ligne 6-15) :

```typescript
type UpcomingTournament = {
  // ... champs existants ...
  price: number | null;              // ⬅️ AJOUTER
};
```

#### Affichage

**Après** l'affichage des inscrits (vers ligne 91), **avant** `<div className="mt-3 flex gap-2">`, **ajouter** :

```tsx
{tournament.price !== null && tournament.price > 0 && (
  <div className="mt-1 flex items-center gap-2 text-xs text-white/80">
    <span>💰</span>
    <span className="font-semibold">
      {new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(tournament.price)}
    </span>
  </div>
)}
{tournament.price === 0 && (
  <div className="mt-1 flex items-center gap-2 text-xs text-white/80">
    <span>🎁</span>
    <span className="font-semibold">Gratuit</span>
  </div>
)}
```

---

# ✅ CHECKLIST COMPLÈTE DE VÉRIFICATION

## Partie A - Système d'Inscription

### Base de données
- [ ] Migration 001 exécutée avec succès
- [ ] Colonne `email` est nullable
- [ ] Colonne `phone` est obligatoire et unique
- [ ] Colonnes `is_ranked`, `ranking`, `play_preference` existent
- [ ] Vue `player_stats` mise à jour

### Backend
- [ ] Fichier `phone-utils.ts` créé avec les 3 fonctions
- [ ] Action `registerForTournament` utilise le téléphone
- [ ] API `/verify-phone/route.ts` créée et fonctionnelle
- [ ] Validation multi-formats fonctionne

### Frontend
- [ ] Champ téléphone obligatoire avec validation
- [ ] Champ email optionnel
- [ ] Questionnaire complet affiché
- [ ] Champ ranking conditionnel fonctionne
- [ ] Niveaux 1-7 dans la liste
- [ ] Vérification par téléphone fonctionne

## Partie B - Prix des Tournois

### Base de données
- [ ] Migration 002 exécutée
- [ ] Colonne `price` existe
- [ ] Contrainte CHECK empêche prix négatifs

### Backend
- [ ] Type `Tournament` inclut `price`
- [ ] Action `upsertTournamentAction` gère le prix (INSERT + UPDATE)

### Frontend
- [ ] Champ prix dans formulaire admin
- [ ] Valeur pré-remplie lors de l'édition
- [ ] Prix affiché sur home page
- [ ] "Gratuit" pour prix = 0
- [ ] Rien affiché si prix = null

---

# 🚀 ORDRE D'EXÉCUTION RECOMMANDÉ

1. **Migration 001** (système d'inscription)
2. **Créer** `src/lib/phone-utils.ts`
3. **Créer** API `verify-phone/route.ts`
4. **Vérifier** que `src/app/actions/registrations.ts` a les modifications
5. **Modifier** `src/app/inscription/registration-form.tsx`
6. **Tester** le formulaire d'inscription
7. **Migration 002** (prix)
8. **Modifier** `src/lib/types.ts` (ajouter price)
9. **Modifier** `src/app/actions/tournaments.ts`
10. **Modifier** `src/components/admin/tabs/TournamentsTab.tsx`
11. **Modifier** `src/app/page.tsx`
12. **Modifier** `src/components/home/UpcomingTournaments.tsx`
13. **Tester** l'ensemble du flow

---

# 🧪 TESTS MANUELS COMPLETS

## Tests Partie A (Inscription)

1. **Formats de téléphone** : Tester 06.12.34.56.78, +33 6 12 34 56 78, etc.
2. **Nouveau joueur** : Créer avec téléphone, email vide, niveau 5, classé P1000, préférence droite
3. **Joueur existant** : Vérifier par téléphone dans un format différent
4. **Validation** : Téléphone invalide → message d'erreur

## Tests Partie B (Prix)

1. **Créer tournoi avec prix** : 35,00 € → vérifie affichage sur home
2. **Modifier prix** : Passer de 35 à 50 → vérifie mise à jour
3. **Tournoi gratuit** : Prix = 0 → affiche "🎁 Gratuit"
4. **Sans prix** : Laisser vide → rien ne s'affiche
5. **Validation** : Prix négatif bloqué par le navigateur

---

# 📊 RÉCAPITULATIF DES FICHIERS

```
Fichiers à créer (4) :
├── database/migrations/001_phone_as_identifier.sql
├── database/migrations/002_add_price_to_tournaments.sql
├── src/lib/phone-utils.ts
└── src/app/api/tournaments/[id]/verify-phone/route.ts

Fichiers à modifier (6) :
├── src/lib/types.ts
├── src/app/actions/registrations.ts (déjà fait)
├── src/app/actions/tournaments.ts
├── src/app/inscription/registration-form.tsx
├── src/components/admin/tabs/TournamentsTab.tsx
├── src/app/page.tsx
└── src/components/home/UpcomingTournaments.tsx
```

---

# 💡 NOTES IMPORTANTES

## Formats de Téléphone
Le système normalise automatiquement vers E.164 (+33XXXXXXXXX) et supporte :
- `0XXXXXXXXX`
- `0X.XX.XX.XX.XX`
- `0X XX XX XX XX`
- `+33XXXXXXXXX`
- `+33X.XX.XX.XX.XX`
- `+33X XX XX XX XX`

## Comportement des Prix
- **null** : Rien ne s'affiche
- **0** : Affiche "🎁 Gratuit"
- **> 0** : Affiche "💰 XX,XX €"

## Compatibilité
- Tournois existants sans prix → `price = null` (OK)
- Joueurs existants sans téléphone → Nécessite nettoyage manuel
- Email devient optionnel → Les anciens avec email fonctionnent toujours

---

Bonne implémentation ! 🎾
