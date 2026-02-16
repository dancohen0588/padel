# Prompt d'Implémentation - Nouveau Formulaire d'Inscription au Tournoi

## 📋 Contexte du Projet

**Projet** : Application Next.js 14+ (App Router) de gestion de tournois de padel
**Base de données** : PostgreSQL avec SQL direct (pas de Prisma)
**Stack technique** :
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- PostgreSQL
- Server Actions

## 🎯 Objectif Global

Modifier le système d'inscription aux tournois pour :
1. **Remplacer l'email par le téléphone** comme identifiant unique des joueurs
2. **Rendre l'email optionnel** (actuellement obligatoire)
3. **Ajouter un questionnaire** avec 3 questions (niveau 1-7, classement padel, préférence de jeu)
4. **Supporter plusieurs formats de numéros de téléphone** français avec normalisation automatique

---

## 🗄️ ÉTAPE 1 : Migration de Base de Données

### Fichier à créer : `database/migrations/XXXX_phone_as_identifier.sql`

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
-- On utilise une fonction pour normaliser le téléphone (enlever espaces, points, remplacer +33 par 0)
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_phone_unique
ON public.players (
  CASE
    WHEN phone ~ '^\+33' THEN '0' || regexp_replace(substring(phone from 4), '[^0-9]', '', 'g')
    ELSE regexp_replace(phone, '[^0-9]', '', 'g')
  END
);

-- 6. Créer un index partiel sur email pour les emails non nuls (permettre les emails dupliqués si NULL)
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

**Important** : Exécuter cette migration via votre outil habituel (ex: `psql < database/migrations/XXX.sql`)

---

## 🛠️ ÉTAPE 2 : Fonction Utilitaire de Normalisation du Téléphone

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
    const digits = cleaned.substring(3); // Enlever +33
    if (digits.length === 9) {
      return '+33' + digits;
    }
    return null; // Format invalide
  }

  // Cas 2: Le numéro commence par 33 (sans +)
  if (cleaned.startsWith('33') && cleaned.length === 11) {
    return '+' + cleaned;
  }

  // Cas 3: Le numéro commence par 0 (format français classique)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '+33' + cleaned.substring(1); // Remplacer 0 par +33
  }

  // Cas 4: 9 chiffres sans indicatif (on suppose qu'il manque le 0 initial)
  if (cleaned.length === 9 && !cleaned.startsWith('0')) {
    return '+33' + cleaned;
  }

  // Format invalide
  return null;
}

/**
 * Valide si un numéro de téléphone est au bon format
 */
export function isValidPhoneNumber(phone: string): boolean {
  return normalizePhoneNumber(phone) !== null;
}

/**
 * Formate un numéro de téléphone pour l'affichage (format français lisible)
 * Exemple: +33612345678 → 06 12 34 56 78
 */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return phone;

  // Convertir +33XXXXXXXXX en 0X XX XX XX XX
  const digits = '0' + normalized.substring(3);
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ');
}
```

---

## ⚛️ ÉTAPE 3 : Modifier le Composant React RegistrationForm

### Fichier à modifier : `src/app/inscription/registration-form.tsx`

**Modifications principales** :

### 3.1 Importer les utilitaires de téléphone

```typescript
import { normalizePhoneNumber, isValidPhoneNumber, formatPhoneForDisplay } from "@/lib/phone-utils";
```

### 3.2 Remplacer les états liés à l'email par le téléphone

**Avant** :
```typescript
const [email, setEmail] = useState("");
const [emailStatus, setEmailStatus] = useState<"idle" | "success" | "error">("idle");
const [emailMessage, setEmailMessage] = useState<string | null>(null);
```

**Après** :
```typescript
const [phone, setPhone] = useState("");
const [phoneStatus, setPhoneStatus] = useState<"idle" | "success" | "error">("idle");
const [phoneMessage, setPhoneMessage] = useState<string | null>(null);
```

### 3.3 Ajouter les états pour le questionnaire

```typescript
const [isRanked, setIsRanked] = useState(false);
```

### 3.4 Mettre à jour le type VerifiedPlayer

```typescript
type VerifiedPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;  // Maintenant nullable
  phone: string;          // Ajouté
  photoUrl: string | null;
  level: string | null;
  isRanked: boolean;      // Ajouté
  ranking: string | null; // Ajouté
  playPreference: string | null; // Ajouté
  tournamentsPlayed: number;
};
```

### 3.5 Modifier les labels de niveau pour accepter 1-7

**Supprimer** :
```typescript
const LEVEL_LABELS: Record<string, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
  expert: "Expert",
};
```

**Ajouter** :
```typescript
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

### 3.6 Modifier la fonction handleVerifyEmail en handleVerifyPhone

```typescript
const handleVerifyPhone = async () => {
  const trimmedPhone = phone.trim();
  if (!trimmedPhone) {
    setPhoneStatus("error");
    setPhoneMessage("Veuillez entrer un numéro de téléphone valide");
    return;
  }

  // Valider le format
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

### 3.7 Mettre à jour le rendu JSX

#### Remplacer le champ Email par Téléphone (obligatoire)

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

#### Ajouter le champ Email (maintenant optionnel) APRÈS le téléphone

```tsx
{mode === "new" ? (
  <>
    {/* ... Prénom et Nom ... */}

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

    {/* ... Suite des champs ... */}
  </>
) : null}
```

#### Remplacer le champ Niveau par une liste 1-7 et ajouter le questionnaire

```tsx
{mode === "new" ? (
  <>
    {/* ... Prénom, Nom, Téléphone, Email ... */}

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

        {/* Champ conditionnel de classement */}
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
            <input
              type="radio"
              name="playPreference"
              value="droite"
              required
              className="h-4 w-4 accent-orange-500"
            />
            <span className="text-sm text-white">Jouer à droite</span>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 cursor-pointer transition hover:bg-white/10">
            <input
              type="radio"
              name="playPreference"
              value="gauche"
              required
              className="h-4 w-4 accent-orange-500"
            />
            <span className="text-sm text-white">Jouer à gauche</span>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 cursor-pointer transition hover:bg-white/10">
            <input
              type="radio"
              name="playPreference"
              value="aucune"
              defaultChecked
              required
              className="h-4 w-4 accent-orange-500"
            />
            <span className="text-sm text-white">Pas de préférence</span>
          </label>
        </div>
      </div>
    </div>

    {/* Photo de profil */}
    <div className="space-y-2">
      <label className="mb-2 block text-sm font-medium text-white/80">
        Photo de profil
      </label>
      <ImageDropzone
        onImageSelected={setPlayerPhoto}
        label={""}
        description="Glissez votre photo ici"
        aspectRatio="1/1"
        maxSize={5 * 1024 * 1024}
        className="mx-auto max-w-[200px]"
      />
    </div>
  </>
) : null}
```

#### Modifier les boutons de vérification

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

#### Mettre à jour le message informatif pour le mode "existing"

```tsx
{mode === "existing" ? (
  <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
    ℹ️ Utilisez le numéro de téléphone de votre première inscription pour
    retrouver votre compte et compiler vos statistiques.
  </div>
) : null}
```

#### Mettre à jour la carte du joueur vérifié pour afficher le téléphone

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

### 3.8 Mettre à jour la fonction enhancedAction

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

## 🔧 ÉTAPE 4 : Modifier les Server Actions

### Fichier à modifier : `src/app/actions/registrations.ts`

### 4.1 Importer les utilitaires de téléphone

```typescript
import { normalizePhoneNumber } from "@/lib/phone-utils";
```

### 4.2 Modifier la fonction normalizeEmail en normalizePhone

**Supprimer** :
```typescript
const normalizeEmail = (value: string) => value.trim().toLowerCase();
```

**Ajouter** :
```typescript
const normalizePhone = (value: string): string | null => {
  return normalizePhoneNumber(value);
};
```

### 4.3 Mettre à jour la fonction createPlayer

```typescript
const createPlayer = async (
  database: Sql,
  {
    firstName,
    lastName,
    email,
    phone,
    level,
    isRanked,
    ranking,
    playPreference,
  }: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
    level: string;
    isRanked: boolean;
    ranking: string | null;
    playPreference: string;
  }
): Promise<string> => {
  const createdPlayers = await database<Array<{ id: string }>>`
    insert into players (
      first_name,
      last_name,
      email,
      phone,
      level,
      is_ranked,
      ranking,
      play_preference
    )
    values (
      ${firstName},
      ${lastName},
      ${email || null},
      ${phone},
      ${level},
      ${isRanked},
      ${ranking || null},
      ${playPreference}
    )
    returning id
  `;

  if (!createdPlayers[0]?.id) {
    throw new Error("Création joueur échouée.");
  }

  return createdPlayers[0].id;
};
```

### 4.4 Mettre à jour la fonction registerForTournament

```typescript
const registerForTournament = async (
  database: Sql,
  tournamentId: string,
  formData: FormData
): Promise<RegistrationResult> => {
  const mode = String(formData.get("mode") ?? "new") as RegistrationMode;
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const phone = normalizePhone(rawPhone);

  if (!phone) {
    return {
      status: "error",
      message: "Veuillez entrer un numéro de téléphone valide"
    };
  }

  if (mode === "existing") {
    const playerId = String(formData.get("playerId") ?? "").trim();

    if (!playerId) {
      return { status: "error", message: "Joueur non trouvé." };
    }

    // Vérifier que le joueur existe avec ce téléphone
    const [player] = await database<Array<{ id: string; phone: string }>>`
      select id, phone
      from players
      where id = ${playerId}
      limit 1
    `;

    if (!player || normalizePhone(player.phone) !== phone) {
      return { status: "error", message: "Joueur non trouvé." };
    }

    await ensureRegistration(database, tournamentId, playerId);

    return {
      status: "ok",
      message:
        "✓ Inscription réussie ! Votre compte a été rattaché à ce tournoi. Votre demande est en attente de validation.",
    };
  }

  // Mode "new"
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const level = String(formData.get("level") ?? "").trim();
  const isRankedValue = String(formData.get("isRanked") ?? "non");
  const isRanked = isRankedValue === "oui";
  const ranking = isRanked ? String(formData.get("ranking") ?? "").trim() : null;
  const playPreference = String(formData.get("playPreference") ?? "aucune").trim();

  // Validation des champs obligatoires
  if (!firstName || !lastName || !phone || !level) {
    return { status: "error", message: "Champs requis manquants." };
  }

  // Vérifier si le téléphone existe déjà
  const existingPlayers = await database<Array<{ id: string }>>`
    select id
    from players
    where CASE
      WHEN phone ~ '^\\+33' THEN '0' || regexp_replace(substring(phone from 4), '[^0-9]', '', 'g')
      ELSE regexp_replace(phone, '[^0-9]', '', 'g')
    END = ${phone.replace(/^\+33/, '0').replace(/\D/g, '')}
    limit 1
  `;

  if (existingPlayers[0]?.id) {
    return {
      status: "error",
      message:
        "Ce numéro de téléphone est déjà utilisé. Veuillez utiliser le mode 'Participant existant' pour vous rattacher à votre compte.",
    };
  }

  // Créer le joueur
  const playerId = await createPlayer(database, {
    firstName,
    lastName,
    email,
    phone,
    level,
    isRanked,
    ranking,
    playPreference,
  });

  // Gérer la photo si présente
  const playerPhoto = formData.get("player_photo") as File | null;
  if (playerPhoto && playerPhoto.size > 0) {
    const photoData = new FormData();
    photoData.set("player_photo", playerPhoto);
    await updatePlayerPhoto(playerId, photoData);
  }

  await ensureRegistration(database, tournamentId, playerId);

  return {
    status: "ok",
    message:
      "✓ Inscription réussie ! Votre demande est en attente de validation par l'administrateur.",
  };
};
```

---

## 🌐 ÉTAPE 5 : Créer la nouvelle API de Vérification du Téléphone

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

    // Recherche du joueur avec normalisation du téléphone
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

## 🗑️ ÉTAPE 6 : (Optionnel) Supprimer l'ancienne API verify-email

Si vous n'en avez plus besoin, vous pouvez supprimer :
- `src/app/api/tournaments/[id]/verify-email/route.ts`

Ou la conserver si vous souhaitez maintenir une compatibilité rétrograde.

---

## ✅ CHECKLIST DE VÉRIFICATION

Avant de considérer l'implémentation terminée, vérifier que :

### Base de données
- [ ] La migration SQL a été exécutée avec succès
- [ ] L'index unique sur `phone` fonctionne
- [ ] L'email est bien devenu nullable
- [ ] Les nouveaux champs (`is_ranked`, `ranking`, `play_preference`) sont présents
- [ ] La vue `player_stats` a été mise à jour

### Backend
- [ ] Le fichier `src/lib/phone-utils.ts` existe et exporte les 3 fonctions
- [ ] Les actions dans `src/app/actions/registrations.ts` utilisent le téléphone comme identifiant
- [ ] La validation du téléphone fonctionne (teste plusieurs formats)
- [ ] L'API `/api/tournaments/[id]/verify-phone/route.ts` existe et fonctionne

### Frontend
- [ ] Le composant `RegistrationForm` utilise le téléphone au lieu de l'email
- [ ] Le champ téléphone est obligatoire avec validation
- [ ] Le champ email est optionnel
- [ ] Le questionnaire avec les 3 questions est affiché
- [ ] Le champ ranking apparaît/disparaît selon la sélection "classé"
- [ ] Les niveaux 1-7 sont dans la liste déroulante
- [ ] Le message informatif parle de "numéro de téléphone" et non d'"email"

### Tests manuels
- [ ] Inscription d'un nouveau joueur avec téléphone formaté différemment (teste 3-4 formats)
- [ ] Vérification d'un joueur existant par téléphone
- [ ] Inscription avec email vide (doit fonctionner)
- [ ] Sélection "Classé = Oui" affiche bien le champ ranking
- [ ] Tous les champs du questionnaire sont sauvegardés en base
- [ ] Message d'erreur clair si téléphone invalide
- [ ] Message d'erreur si téléphone déjà utilisé

---

## 🚀 ORDRE D'EXÉCUTION RECOMMANDÉ

1. **Créer** `src/lib/phone-utils.ts` avec les fonctions de normalisation
2. **Exécuter** la migration SQL `database/migrations/XXXX_phone_as_identifier.sql`
3. **Créer** l'API `src/app/api/tournaments/[id]/verify-phone/route.ts`
4. **Modifier** `src/app/actions/registrations.ts`
5. **Modifier** `src/app/inscription/registration-form.tsx`
6. **Tester** l'ensemble du flow (nouveau joueur + joueur existant)
7. **Vérifier** que les données sont bien enregistrées en base avec les nouveaux champs

---

## 📝 NOTES IMPORTANTES

### Gestion des données existantes
Si vous avez déjà des joueurs en base sans téléphone :
- La migration remplace les téléphones NULL par `migration-{id}` pour éviter les erreurs
- Vous devrez nettoyer ces données manuellement ou demander aux joueurs de mettre à jour leur profil

### Format E.164
Le format E.164 (+33XXXXXXXXX) est le format international standard :
- Facilite l'envoi de SMS (futurs développements)
- Évite les ambiguïtés
- Permet la validation stricte

### Email optionnel
L'email reste dans la base de données mais :
- N'est plus obligatoire
- Ne sert plus d'identifiant unique
- Peut être utilisé pour les notifications (si fourni)

### Classement padel
Le champ `ranking` est libre (TEXT) pour supporter différents formats :
- Français : P250, P500, P1000, P1500, P2000
- International : 15/1, 15/2, etc.
- Ou tout autre format custom

---

## 🎨 RÉFÉRENCE DE LA CHARTE GRAPHIQUE

```css
/* Dégradé de fond */
background: linear-gradient(135deg, #1E1E2E 0%, #2A2A3E 100%);

/* Conteneur principal */
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 1rem;

/* Bouton principal (gradient orange) */
background: linear-gradient(to right, #f97316, #fb923c);

/* Messages de succès */
border-color: rgba(16, 185, 129, 0.3);
background-color: rgba(16, 185, 129, 0.1);
color: #6ee7b7;

/* Messages d'erreur */
border-color: rgba(239, 68, 68, 0.3);
background-color: rgba(239, 68, 68, 0.1);
color: #fca5a5;

/* Inputs */
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.2);
color: white;
```

---

## 🔍 EXEMPLE DE TEST COMPLET

Pour valider que tout fonctionne :

1. **Tester les formats de téléphone** :
   ```
   ✅ 0612345678
   ✅ 06.12.34.56.78
   ✅ 06 12 34 56 78
   ✅ +33612345678
   ✅ +33 6 12 34 56 78
   ✅ +33 6.12.34.56.78
   ❌ 12345 (invalide)
   ❌ 06123456 (trop court)
   ```

2. **Créer un nouveau joueur** :
   - Remplir le formulaire avec téléphone
   - Laisser l'email vide
   - Sélectionner niveau 5
   - Cocher "Classé = Oui" et entrer "P1000"
   - Sélectionner "Jouer à droite"
   - Soumettre
   - Vérifier en base que toutes les données sont présentes

3. **Vérifier un joueur existant** :
   - Basculer sur "Participant existant"
   - Entrer le téléphone dans un format différent (ex: si enregistré avec +33, tester avec 06...)
   - Vérifier que le joueur est trouvé
   - Confirmer l'inscription

4. **Tester les erreurs** :
   - Téléphone invalide → Message d'erreur clair
   - Téléphone déjà utilisé en mode "nouveau" → Message approprié
   - Téléphone inconnu en mode "existant" → Message approprié

---

Bonne implémentation ! 🚀
