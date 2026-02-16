# Prompt d'implémentation : Inscription en Binôme

## 🎯 Objectif

Permettre à un utilisateur de s'inscrire en binôme (paire de deux joueurs) directement depuis le formulaire d'inscription, avec la possibilité de :
- S'inscrire seul avec un champ optionnel "binôme" pour indiquer avec qui il souhaite jouer
- S'inscrire en tant que paire (deux joueurs simultanément) avec liaison automatique du binôme en base de données

## 📋 Contexte technique

### Stack
- **Framework** : Next.js 14+ (App Router)
- **TypeScript** : Strict mode activé
- **Base de données** : PostgreSQL (requêtes SQL directes, pas de Prisma)
- **Server Actions** : Pour les mutations côté serveur
- **Styling** : Tailwind CSS avec thème sombre (#1E1E2E)
- **Validation** : HTML5 + validation serveur

### Principes existants
- Normalisation des numéros de téléphone avec `normalizePhoneNumber()` depuis `/lib/phone-utils.ts`
- Les joueurs peuvent être "nouveaux" ou "existants" (vérifiés par téléphone)
- Statut d'inscription : `pending`, `approved`, `rejected`
- Pattern de composant ImageDropzone pour upload de photos

---

## 📂 Fichiers à modifier

### 1. Migration SQL (nouveau fichier)
**Chemin** : `/database/migrations/2026-02-17-add-pair-with-to-players.sql`

### 2. Formulaire d'inscription
**Chemin** : `/src/app/inscription/registration-form.tsx`

### 3. Server Actions
**Chemin** : `/src/app/actions/registrations.ts`

### 4. Onglet Joueurs (Admin)
**Chemin** : `/src/components/admin/tabs/UsersValidatedTab.tsx`

### 5. Onglet Équipes (Admin)
**Chemin** : `/src/components/tournaments/admin/TournamentConfigAdmin.tsx`

### 6. Types TypeScript
**Chemin** : `/src/lib/types.ts`

---

## 🔧 Spécifications fonctionnelles détaillées

### A. Formulaire d'inscription - Mode Solo

**Comportement actuel conservé** :
- Toggle "Avez-vous déjà participé à un tournoi ?" (nouveau/existant)
- Tous les champs existants (téléphone, prénom, nom, email, questionnaire, photo)

**Ajout** :
- **Nouveau champ** : "Binôme" (optionnel)
  - Type : `input[type="text"]`
  - Label : `Binôme` avec mention `(optionnel)`
  - Placeholder : `"Prénom et nom de votre binôme (ex: Jean Dupont)"`
  - Description : `"Si vous souhaitez jouer avec un binôme en particulier, indiquez son nom ici."`
  - Position : Après le champ "Photo de profil"
  - Classe : Design identique aux autres champs (border-white/20, bg-white/5, etc.)

**Visibilité** :
- Ce champ est **visible uniquement en mode solo** (pas en mode binôme)
- En mode "nouveau joueur" ET mode "joueur existant"

### B. Formulaire d'inscription - Mode Binôme

**Déclenchement** :
- Bouton **"+ Ajouter mon binôme"** au-dessus du formulaire
- Au clic : bascule en mode binôme

**Changements visuels** :
- Container principal : `max-width` passe de `600px` à `1400px`
- Affichage du bouton **"Retirer le binôme"** (couleur rose : `border-rose-400/40`, `bg-rose-500/10`, `text-rose-300`)
- Info box : `"✓ Les deux joueurs seront inscrits ensemble au tournoi et pourront former une équipe"` (border-emerald-500/30, bg-emerald-500/10)
- Layout : `lg:grid lg:grid-cols-2 lg:gap-6` pour afficher les deux formulaires côte à côte sur desktop

**Structure** :
- **Formulaire Joueur 1** :
  - Badge : `"Joueur 1"` (orange : border-orange-400/30, bg-orange-500/15, text-orange-300)
  - Toggle nouveau/existant indépendant
  - Tous les champs du formulaire (téléphone, prénom, nom, email, questionnaire, photo)
  - **Le champ "binôme" est masqué** en mode binôme

- **Formulaire Joueur 2** :
  - Badge : `"Joueur 2"` (emerald : border-emerald-400/30, bg-emerald-500/15, text-emerald-300)
  - Toggle nouveau/existant indépendant
  - Tous les champs du formulaire (identiques au Joueur 1)
  - **Pas de champ "binôme"** non plus

**Bloc Informations de paiement** :
- Commun pour les deux joueurs
- Prix affiché : `25,00 €` avec note `" par joueur (soit 50,00 € pour le binôme)"` visible uniquement en mode binôme
- Modal des moyens de paiement identique à l'actuel

**Bouton Submit** :
- Texte en mode solo : `"S'inscrire au tournoi"`
- Texte en mode binôme : `"Inscrire les deux joueurs"`

### C. Logique du champ "binôme" en base de données

**Colonne** : `pair_with` (type `text`, nullable)

**Cas 1 : Inscription solo avec champ "binôme" rempli**
- Valeur stockée : texte saisi par l'utilisateur (ex: "Jean Dupont")
- Exemple SQL :
  ```sql
  UPDATE players SET pair_with = 'Jean Dupont' WHERE id = '<player_id>';
  ```

**Cas 2 : Inscription solo sans champ "binôme"**
- Valeur stockée : `NULL`

**Cas 3 : Inscription en binôme (deux joueurs simultanément)**
- **Joueur 1** : `pair_with = '<prénom> <nom> du Joueur 2'`
- **Joueur 2** : `pair_with = '<prénom> <nom> du Joueur 1'`
- Exemple :
  ```sql
  -- Si Joueur 1 = "Marie Martin" et Joueur 2 = "Sophie Durand"
  UPDATE players SET pair_with = 'Sophie Durand' WHERE id = '<player1_id>';
  UPDATE players SET pair_with = 'Marie Martin' WHERE id = '<player2_id>';
  ```

### D. Affichage dans l'interface admin

#### 1. Onglet "Joueurs" (UsersValidatedTab)

**Localisation** : Cards des joueurs validés (section avec `map` sur `filteredRegistrations`)

**Modification** :
- Après l'affichage du téléphone (`formatPhoneForDisplay(player.phone)`)
- **Ajouter** une ligne pour le binôme si `player.pair_with` est renseigné :
  ```tsx
  {player.pair_with ? (
    <p className="text-xs text-white/50">
      <span className="text-white/70">👥 Binôme :</span> {player.pair_with}
    </p>
  ) : null}
  ```

**Style** :
- Icône : `👥` (pour indiquer la paire)
- Texte : `text-xs text-white/50` pour la valeur
- Label "Binôme :" : `text-white/70`

#### 2. Onglet "Équipes" (TournamentConfigAdmin)

**Localisation 1** : Section "Joueurs non assignés" (gauche) - Cards des joueurs dans `unassignedPlayers`

**Modification** :
- Après le nom du joueur (`{player.first_name} {player.last_name}`)
- **Ajouter** une ligne pour le binôme si `player.pair_with` est renseigné :
  ```tsx
  {player.pair_with ? (
    <p className="text-[10px] text-white/50">
      👥 {player.pair_with}
    </p>
  ) : null}
  ```

**Localisation 2** : Équipes créées (droite) - Affichage des joueurs dans une équipe

**Modification** :
- Dans le `map` des slots (lignes ~417-444 du fichier actuel)
- Après le nom du joueur affiché dans l'équipe
- **Ajouter** une ligne pour le binôme si `player.pair_with` est renseigné :
  ```tsx
  {player.pair_with ? (
    <span className="text-[10px] text-white/40">
      👥 {player.pair_with}
    </span>
  ) : null}
  ```

**Localisation 3** : Section "Équipes complètes" (gauche en mode poules) - Cards des équipes non assignées

**Modification** :
- Dans le `map` des `unassignedTeams` (lignes ~499-517 du fichier actuel)
- Cette section affiche déjà les noms des joueurs de chaque équipe
- **Ajouter** le binôme de chaque joueur juste après son nom :
  ```tsx
  {(teamPlayerMap.get(team.id) ?? [])
    .map((playerId) => {
      const player = playerById.get(playerId);
      if (!player) return "";
      const playerName = `${player.first_name} ${player.last_name}`;
      const pairInfo = player.pair_with ? ` (👥 ${player.pair_with})` : "";
      return playerName + pairInfo;
    })
    .filter(Boolean)
    .join(" / ")}
  ```

---

## 🛠️ Implémentation détaillée

### 1. Migration SQL

**Fichier** : `/database/migrations/2026-02-17-add-pair-with-to-players.sql`

```sql
-- Migration: Ajouter le champ pair_with à la table players
-- Date: 2026-02-17
-- Description: Permet d'indiquer avec qui un joueur souhaite jouer en binôme

ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS pair_with TEXT;

COMMENT ON COLUMN public.players.pair_with IS 'Nom du binôme souhaité (rempli manuellement en solo ou automatiquement en inscription binôme)';
```

**Exécution** :
```bash
psql -U <user> -d <database> -f /database/migrations/2026-02-17-add-pair-with-to-players.sql
```

---

### 2. Types TypeScript

**Fichier** : `/src/lib/types.ts`

**Modification du type `Player`** :
```typescript
export type Player = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  level: string | null;
  is_ranked: boolean;
  ranking: string | null;
  play_preference: string | null;
  photo_url: string | null;
  created_at: string;
  pair_with: string | null; // 👈 NOUVEAU CHAMP
};
```

**Nouveau type pour l'inscription en binôme** :
```typescript
export type PairRegistrationData = {
  player1: {
    mode: "new" | "existing";
    phone: string;
    playerId?: string; // Si mode = existing
    firstName?: string; // Si mode = new
    lastName?: string; // Si mode = new
    email?: string | null; // Si mode = new
    level?: string; // Si mode = new
    isRanked?: boolean; // Si mode = new
    ranking?: string | null; // Si mode = new
    playPreference?: string; // Si mode = new
    photo?: File | null; // Si mode = new
  };
  player2: {
    mode: "new" | "existing";
    phone: string;
    playerId?: string; // Si mode = existing
    firstName?: string; // Si mode = new
    lastName?: string; // Si mode = new
    email?: string | null; // Si mode = new
    level?: string; // Si mode = new
    isRanked?: boolean; // Si mode = new
    ranking?: string | null; // Si mode = new
    playPreference?: string; // Si mode = new
    photo?: File | null; // Si mode = new
  };
  tournamentId: string;
};
```

---

### 3. Server Action - Inscription en binôme

**Fichier** : `/src/app/actions/registrations.ts`

**Nouvelle Server Action** : `registerPairAction`

**Signature** :
```typescript
export async function registerPairAction(
  prevState: any,
  formData: FormData
): Promise<{
  status: "ok" | "error";
  message: string;
  player1Id?: string;
  player2Id?: string;
  tournamentId?: string;
  whatsappGroupLink?: string | null;
  hasAlreadyJoined?: boolean;
}>;
```

**Logique** :

```typescript
"use server";

import { redirect } from "next/navigation";
import { normalizePhoneNumber } from "@/lib/phone-utils";
import { getDb } from "@/lib/db";

export async function registerPairAction(
  prevState: any,
  formData: FormData
): Promise<{
  status: "ok" | "error";
  message: string;
  player1Id?: string;
  player2Id?: string;
  tournamentId?: string;
  whatsappGroupLink?: string | null;
  hasAlreadyJoined?: boolean;
}> {
  const db = getDb();
  const tournamentId = String(formData.get("tournamentId") ?? "").trim();

  if (!tournamentId) {
    return { status: "error", message: "Tournoi introuvable." };
  }

  // ========== JOUEUR 1 ==========
  const player1Mode = String(formData.get("player1Mode") ?? "new");
  const player1Phone = normalizePhoneNumber(String(formData.get("player1Phone") ?? "").trim());

  if (!player1Phone) {
    return { status: "error", message: "Le numéro de téléphone du Joueur 1 est invalide." };
  }

  let player1Id: string;
  let player1FirstName: string;
  let player1LastName: string;

  if (player1Mode === "existing") {
    // Joueur 1 existant
    player1Id = String(formData.get("player1PlayerId") ?? "").trim();
    if (!player1Id) {
      return { status: "error", message: "Joueur 1 introuvable." };
    }

    // Récupérer les infos du joueur 1
    const player1Row = await db.query(
      "SELECT first_name, last_name FROM players WHERE id = $1",
      [player1Id]
    );

    if (player1Row.rows.length === 0) {
      return { status: "error", message: "Joueur 1 introuvable en base." };
    }

    player1FirstName = player1Row.rows[0].first_name;
    player1LastName = player1Row.rows[0].last_name;

  } else {
    // Joueur 1 nouveau
    player1FirstName = String(formData.get("player1FirstName") ?? "").trim();
    player1LastName = String(formData.get("player1LastName") ?? "").trim();
    const player1Email = String(formData.get("player1Email") ?? "").trim() || null;
    const player1Level = String(formData.get("player1Level") ?? "").trim();
    const player1IsRanked = String(formData.get("player1IsRanked") ?? "non") === "oui";
    const player1Ranking = player1IsRanked ? String(formData.get("player1Ranking") ?? "").trim() || null : null;
    const player1PlayPreference = String(formData.get("player1PlayPreference") ?? "").trim();

    if (!player1FirstName || !player1LastName || !player1Level || !player1PlayPreference) {
      return { status: "error", message: "Veuillez remplir tous les champs obligatoires pour le Joueur 1." };
    }

    // Vérifier si le téléphone existe déjà
    const existingPlayer1 = await db.query(
      "SELECT id FROM players WHERE phone = $1",
      [player1Phone]
    );

    if (existingPlayer1.rows.length > 0) {
      return {
        status: "error",
        message: "Le numéro de téléphone du Joueur 1 est déjà utilisé. Utilisez le mode 'joueur existant'."
      };
    }

    // Upload de la photo (si fournie)
    const player1Photo = formData.get("player1_photo") as File | null;
    let player1PhotoUrl: string | null = null;

    if (player1Photo && player1Photo.size > 0) {
      // TODO: Implémenter l'upload vers Supabase Storage
      // player1PhotoUrl = await uploadToStorage(player1Photo, `players/${player1Phone}`);
    }

    // Créer le joueur 1
    const insertPlayer1 = await db.query(
      `INSERT INTO players (first_name, last_name, email, phone, level, is_ranked, ranking, play_preference, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        player1FirstName,
        player1LastName,
        player1Email,
        player1Phone,
        player1Level,
        player1IsRanked,
        player1Ranking,
        player1PlayPreference,
        player1PhotoUrl,
      ]
    );

    player1Id = insertPlayer1.rows[0].id;
  }

  // ========== JOUEUR 2 ==========
  const player2Mode = String(formData.get("player2Mode") ?? "new");
  const player2Phone = normalizePhoneNumber(String(formData.get("player2Phone") ?? "").trim());

  if (!player2Phone) {
    return { status: "error", message: "Le numéro de téléphone du Joueur 2 est invalide." };
  }

  let player2Id: string;
  let player2FirstName: string;
  let player2LastName: string;

  if (player2Mode === "existing") {
    // Joueur 2 existant
    player2Id = String(formData.get("player2PlayerId") ?? "").trim();
    if (!player2Id) {
      return { status: "error", message: "Joueur 2 introuvable." };
    }

    // Récupérer les infos du joueur 2
    const player2Row = await db.query(
      "SELECT first_name, last_name FROM players WHERE id = $1",
      [player2Id]
    );

    if (player2Row.rows.length === 0) {
      return { status: "error", message: "Joueur 2 introuvable en base." };
    }

    player2FirstName = player2Row.rows[0].first_name;
    player2LastName = player2Row.rows[0].last_name;

  } else {
    // Joueur 2 nouveau
    player2FirstName = String(formData.get("player2FirstName") ?? "").trim();
    player2LastName = String(formData.get("player2LastName") ?? "").trim();
    const player2Email = String(formData.get("player2Email") ?? "").trim() || null;
    const player2Level = String(formData.get("player2Level") ?? "").trim();
    const player2IsRanked = String(formData.get("player2IsRanked") ?? "non") === "oui";
    const player2Ranking = player2IsRanked ? String(formData.get("player2Ranking") ?? "").trim() || null : null;
    const player2PlayPreference = String(formData.get("player2PlayPreference") ?? "").trim();

    if (!player2FirstName || !player2LastName || !player2Level || !player2PlayPreference) {
      return { status: "error", message: "Veuillez remplir tous les champs obligatoires pour le Joueur 2." };
    }

    // Vérifier si le téléphone existe déjà
    const existingPlayer2 = await db.query(
      "SELECT id FROM players WHERE phone = $1",
      [player2Phone]
    );

    if (existingPlayer2.rows.length > 0) {
      return {
        status: "error",
        message: "Le numéro de téléphone du Joueur 2 est déjà utilisé. Utilisez le mode 'joueur existant'."
      };
    }

    // Upload de la photo (si fournie)
    const player2Photo = formData.get("player2_photo") as File | null;
    let player2PhotoUrl: string | null = null;

    if (player2Photo && player2Photo.size > 0) {
      // TODO: Implémenter l'upload vers Supabase Storage
      // player2PhotoUrl = await uploadToStorage(player2Photo, `players/${player2Phone}`);
    }

    // Créer le joueur 2
    const insertPlayer2 = await db.query(
      `INSERT INTO players (first_name, last_name, email, phone, level, is_ranked, ranking, play_preference, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        player2FirstName,
        player2LastName,
        player2Email,
        player2Phone,
        player2Level,
        player2IsRanked,
        player2Ranking,
        player2PlayPreference,
        player2PhotoUrl,
      ]
    );

    player2Id = insertPlayer2.rows[0].id;
  }

  // ========== MISE À JOUR DU CHAMP BINÔME ==========
  const player1FullName = `${player1FirstName} ${player1LastName}`;
  const player2FullName = `${player2FirstName} ${player2LastName}`;

  await db.query(
    "UPDATE players SET pair_with = $1 WHERE id = $2",
    [player2FullName, player1Id]
  );

  await db.query(
    "UPDATE players SET pair_with = $1 WHERE id = $2",
    [player1FullName, player2Id]
  );

  // ========== CRÉER LES INSCRIPTIONS ==========
  try {
    // Inscription Joueur 1
    await db.query(
      `INSERT INTO registrations (tournament_id, player_id, status)
       VALUES ($1, $2, 'approved')
       ON CONFLICT (tournament_id, player_id) DO NOTHING`,
      [tournamentId, player1Id]
    );

    // Inscription Joueur 2
    await db.query(
      `INSERT INTO registrations (tournament_id, player_id, status)
       VALUES ($1, $2, 'approved')
       ON CONFLICT (tournament_id, player_id) DO NOTHING`,
      [tournamentId, player2Id]
    );

  } catch (error) {
    console.error("Error creating registrations:", error);
    return {
      status: "error",
      message: "Erreur lors de la création des inscriptions."
    };
  }

  // ========== RÉCUPÉRER LE LIEN WHATSAPP (si configuré) ==========
  const tournamentRow = await db.query(
    "SELECT whatsapp_group_link FROM tournaments WHERE id = $1",
    [tournamentId]
  );

  const whatsappGroupLink = tournamentRow.rows[0]?.whatsapp_group_link || null;

  // Vérifier si les joueurs ont déjà rejoint le groupe WhatsApp
  const hasAlreadyJoined = false; // TODO: Implémenter la vérification

  return {
    status: "ok",
    message: `Inscription validée pour ${player1FullName} et ${player2FullName} !`,
    player1Id,
    player2Id,
    tournamentId,
    whatsappGroupLink,
    hasAlreadyJoined,
  };
}
```

---

### 4. Modification du formulaire d'inscription

**Fichier** : `/src/app/inscription/registration-form.tsx`

**Changements requis** :

#### A. États supplémentaires

```typescript
const [isPairMode, setIsPairMode] = useState(false);
const [player1Photo, setPlayer1Photo] = useState<File | null>(null);
const [player2Photo, setPlayer2Photo] = useState<File | null>(null);
const [player1Mode, setPlayer1Mode] = useState<RegistrationMode>("new");
const [player2Mode, setPlayer2Mode] = useState<RegistrationMode>("new");
const [player1Phone, setPlayer1Phone] = useState("");
const [player2Phone, setPlayer2Phone] = useState("");
const [player1VerifiedPlayer, setPlayer1VerifiedPlayer] = useState<VerifiedPlayer | null>(null);
const [player2VerifiedPlayer, setPlayer2VerifiedPlayer] = useState<VerifiedPlayer | null>(null);
// ... autres états pour les deux joueurs
```

#### B. Fonction togglePairMode

```typescript
const togglePairMode = () => {
  setIsPairMode(!isPairMode);
};
```

#### C. Fonction enhancedAction pour mode binôme

```typescript
const enhancedAction = async (
  prevState: RegistrationResult | null,
  formData: FormData
) => {
  if (isPairMode) {
    // Mode binôme : appeler registerPairAction
    if (player1Photo) {
      formData.set("player1_photo", player1Photo);
    }
    if (player2Photo) {
      formData.set("player2_photo", player2Photo);
    }

    formData.set("player1Mode", player1Mode);
    formData.set("player2Mode", player2Mode);

    if (player1Mode === "existing" && player1VerifiedPlayer) {
      formData.set("player1PlayerId", player1VerifiedPlayer.id);
      formData.set("player1Phone", player1VerifiedPlayer.phone);
    } else if (player1Mode === "new") {
      const rawPhone = String(formData.get("player1Phone") ?? "").trim();
      const normalizedPhone = normalizePhoneNumber(rawPhone);
      if (normalizedPhone) {
        formData.set("player1Phone", normalizedPhone);
      }
    }

    if (player2Mode === "existing" && player2VerifiedPlayer) {
      formData.set("player2PlayerId", player2VerifiedPlayer.id);
      formData.set("player2Phone", player2VerifiedPlayer.phone);
    } else if (player2Mode === "new") {
      const rawPhone = String(formData.get("player2Phone") ?? "").trim();
      const normalizedPhone = normalizePhoneNumber(rawPhone);
      if (normalizedPhone) {
        formData.set("player2Phone", normalizedPhone);
      }
    }

    return registerPairAction(prevState, formData);
  } else {
    // Mode solo : logique actuelle
    if (playerPhoto) {
      formData.set("player_photo", playerPhoto);
    }

    formData.set("mode", mode);
    if (mode === "existing" && verifiedPlayer) {
      formData.set("playerId", verifiedPlayer.id);
      formData.set("phone", verifiedPlayer.phone);
    } else if (mode === "new") {
      const rawPhone = String(formData.get("phone") ?? "").trim();
      const normalizedPhone = normalizePhoneNumber(rawPhone);
      if (normalizedPhone) {
        formData.set("phone", normalizedPhone);
      }
    }

    return action(prevState, formData);
  }
};
```

#### D. JSX - Boutons Ajouter/Retirer binôme

```tsx
{/* Bouton Ajouter binôme (mode solo) */}
{!isPairMode && (
  <div className="mb-6 flex justify-center">
    <button
      type="button"
      onClick={togglePairMode}
      className="group flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-orange-400/40 hover:bg-orange-500/10"
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
      </svg>
      <span>Ajouter mon binôme</span>
    </button>
  </div>
)}

{/* Bouton Retirer binôme (mode binôme) */}
{isPairMode && (
  <div className="mb-6 flex justify-center">
    <button
      type="button"
      onClick={togglePairMode}
      className="group flex items-center gap-2 rounded-lg border border-rose-400/40 bg-rose-500/10 px-6 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20"
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
      <span>Retirer le binôme</span>
    </button>
  </div>
)}

{/* Info box binôme */}
{isPairMode && (
  <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
    <div className="flex items-start gap-3">
      <span className="text-xl">✓</span>
      <p className="flex-1 text-sm text-emerald-300">
        Les deux joueurs seront inscrits ensemble au tournoi et pourront former une équipe
      </p>
    </div>
  </div>
)}
```

#### E. JSX - Champ "binôme" en mode solo

```tsx
{/* Champ Binôme (uniquement en mode solo) */}
{mode === "new" && !isPairMode && (
  <div>
    <label className="mb-2 block text-sm font-medium text-white/80">
      Binôme <span className="text-xs text-white/50">(optionnel)</span>
    </label>
    <input
      name="pairWith"
      type="text"
      placeholder="Prénom et nom de votre binôme (ex: Jean Dupont)"
      className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40"
    />
    <p className="mt-2 text-xs text-white/50">
      Si vous souhaitez jouer avec un binôme en particulier, indiquez son nom ici.
    </p>
  </div>
)}
```

#### F. JSX - Layout en mode binôme

```tsx
<div
  className={`space-y-6 ${isPairMode ? "lg:grid lg:grid-cols-2 lg:gap-6" : ""}`}
>
  {/* Formulaire Joueur 1 (ou formulaire unique en mode solo) */}
  <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
    {isPairMode && (
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/15 px-4 py-2 text-sm font-semibold text-orange-300">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
          </svg>
          Joueur 1
        </div>
      </div>
    )}
    {/* ... reste du formulaire pour joueur 1 */}
  </div>

  {/* Formulaire Joueur 2 (visible uniquement en mode binôme) */}
  {isPairMode && (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-300">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
          </svg>
          Joueur 2
        </div>
      </div>
      {/* ... formulaire complet pour joueur 2 */}
    </div>
  )}
</div>
```

#### G. Modification du `<PaymentInfoBlock>`

```tsx
<PaymentInfoBlock
  price={price}
  paymentConfig={paymentConfig}
  isPairMode={isPairMode} // 👈 Passer le mode binôme comme prop
/>
```

**Dans le composant PaymentInfoBlock** :
```tsx
type PaymentInfoBlockProps = {
  price: number | null;
  paymentConfig: PaymentConfig | null;
  isPairMode?: boolean; // 👈 NOUVEAU
};

// Dans le JSX
<p className="mb-3 text-xs text-white/70">
  Le prix d'inscription à ce tournoi est de{" "}
  <span className="font-bold text-white">{formattedPrice}</span>
  {isPairMode && (
    <span> par joueur (soit {(price * 2).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} pour le binôme)</span>
  )}
</p>
```

---

### 5. Modification de la Server Action `registerPlayer` existante

**Fichier** : `/src/app/actions/registrations.ts`

**Ajout** : Gestion du champ `pairWith` lors de l'inscription solo

```typescript
// Dans registerPlayer, après avoir créé ou récupéré le joueur
const pairWith = String(formData.get("pairWith") ?? "").trim() || null;

if (mode === "new" && pairWith) {
  // Mettre à jour le champ pair_with pour l'inscription solo
  await db.query(
    "UPDATE players SET pair_with = $1 WHERE id = $2",
    [pairWith, playerId]
  );
}
```

---

### 6. Modifications de l'interface admin

#### A. UsersValidatedTab (Onglet Joueurs)

**Fichier** : `/src/components/admin/tabs/UsersValidatedTab.tsx`

**Localisation** : Dans le `map` des `filteredRegistrations`, après l'affichage du téléphone

```tsx
{/* Téléphone */}
<p className="text-xs text-white/50">
  {formatPhoneForDisplay(player.phone)}
</p>

{/* NOUVEAU : Binôme */}
{player.pair_with ? (
  <p className="text-xs text-white/50">
    <span className="text-white/70">👥 Binôme :</span> {player.pair_with}
  </p>
) : null}
```

#### B. TournamentConfigAdmin (Onglet Équipes)

**Fichier** : `/src/components/tournaments/admin/TournamentConfigAdmin.tsx`

**Modification 1** : Joueurs non assignés (gauche)

```tsx
{/* Dans le map des unassignedPlayers */}
<span className="text-xs font-semibold">
  {player.first_name} {player.last_name}
</span>

{/* NOUVEAU : Binôme */}
{player.pair_with ? (
  <p className="text-[10px] text-white/50">
    👥 {player.pair_with}
  </p>
) : null}
```

**Modification 2** : Joueurs dans une équipe (droite)

```tsx
{/* Dans le map des slots de l'équipe */}
<span className="text-xs font-semibold">
  {player.first_name} {player.last_name}
</span>

{/* NOUVEAU : Binôme */}
{player.pair_with ? (
  <span className="text-[10px] text-white/40">
    👥 {player.pair_with}
  </span>
) : null}
```

**Modification 3** : Équipes complètes (gauche en mode poules)

```tsx
{/* Dans le map des unassignedTeams */}
<p className="text-white/60">
  {(teamPlayerMap.get(team.id) ?? [])
    .map((playerId) => {
      const player = playerById.get(playerId);
      if (!player) return "";
      const playerName = `${player.first_name} ${player.last_name}`;
      const pairInfo = player.pair_with ? ` (👥 ${player.pair_with})` : "";
      return playerName + pairInfo;
    })
    .filter(Boolean)
    .join(" / ")}
</p>
```

---

## ✅ Checklist d'implémentation

### Étape 1 : Base de données
- [ ] Créer le fichier de migration `/database/migrations/2026-02-17-add-pair-with-to-players.sql`
- [ ] Exécuter la migration sur la base de données
- [ ] Vérifier que la colonne `pair_with` existe dans la table `players`

### Étape 2 : Types TypeScript
- [ ] Ajouter le champ `pair_with: string | null` au type `Player` dans `/src/lib/types.ts`
- [ ] Créer le type `PairRegistrationData` dans `/src/lib/types.ts`

### Étape 3 : Server Actions
- [ ] Créer la nouvelle Server Action `registerPairAction` dans `/src/app/actions/registrations.ts`
- [ ] Modifier la Server Action `registerPlayer` pour gérer le champ `pairWith` en mode solo
- [ ] Tester les deux Server Actions avec des données fictives

### Étape 4 : Formulaire d'inscription
- [ ] Ajouter les états pour le mode binôme dans `RegistrationForm` (`isPairMode`, états pour joueur 1 et 2)
- [ ] Créer la fonction `togglePairMode`
- [ ] Modifier la fonction `enhancedAction` pour gérer le mode binôme
- [ ] Ajouter les boutons "Ajouter mon binôme" et "Retirer le binôme"
- [ ] Ajouter l'info box pour le mode binôme
- [ ] Ajouter le champ "binôme" en mode solo (après la photo de profil)
- [ ] Dupliquer le formulaire pour le Joueur 2 avec son propre toggle et ses champs
- [ ] Implémenter le layout en grid (`lg:grid-cols-2`) en mode binôme
- [ ] Ajouter les badges "Joueur 1" (orange) et "Joueur 2" (emerald)
- [ ] Modifier le composant `PaymentInfoBlock` pour afficher le prix total en mode binôme
- [ ] Tester le formulaire en mode solo et binôme

### Étape 5 : Interface admin - Onglet Joueurs
- [ ] Modifier `UsersValidatedTab.tsx` pour afficher le champ `pair_with` sur les cards joueurs
- [ ] Vérifier l'affichage avec l'icône 👥 et le style approprié
- [ ] Tester l'affichage avec des joueurs ayant et n'ayant pas de binôme

### Étape 6 : Interface admin - Onglet Équipes
- [ ] Modifier `TournamentConfigAdmin.tsx` - Section "Joueurs non assignés"
- [ ] Modifier `TournamentConfigAdmin.tsx` - Joueurs dans une équipe
- [ ] Modifier `TournamentConfigAdmin.tsx` - Section "Équipes complètes" (mode poules)
- [ ] Vérifier l'affichage du binôme dans chaque section
- [ ] Tester le drag & drop avec des joueurs ayant un binôme

### Étape 7 : Tests end-to-end
- [ ] **Test 1** : Inscription solo sans binôme
  - Vérifier que `pair_with` est `NULL` en base

- [ ] **Test 2** : Inscription solo avec binôme
  - Renseigner "Jean Dupont" dans le champ binôme
  - Vérifier que `pair_with = "Jean Dupont"` en base
  - Vérifier l'affichage dans l'onglet Joueurs

- [ ] **Test 3** : Inscription en binôme (deux nouveaux joueurs)
  - Joueur 1 : Marie Martin
  - Joueur 2 : Sophie Durand
  - Vérifier que `pair_with` de Marie = "Sophie Durand"
  - Vérifier que `pair_with` de Sophie = "Marie Martin"
  - Vérifier l'affichage dans l'onglet Joueurs et Équipes

- [ ] **Test 4** : Inscription en binôme (un nouveau + un existant)
  - Joueur 1 : nouveau (Paul Dubois)
  - Joueur 2 : existant (Marie Martin)
  - Vérifier la liaison du binôme dans les deux sens

- [ ] **Test 5** : Inscription en binôme (deux existants)
  - Joueur 1 : existant (Marie Martin)
  - Joueur 2 : existant (Sophie Durand)
  - Vérifier la mise à jour du champ `pair_with` pour les deux

### Étape 8 : Validation finale
- [ ] Vérifier que le responsive fonctionne (mobile : stacked, desktop : côte à côte)
- [ ] Vérifier que les photos s'uploadent correctement pour les deux joueurs
- [ ] Vérifier que le lien WhatsApp est affiché après inscription en binôme
- [ ] Vérifier que le paiement est correctement affiché (prix × 2 en binôme)
- [ ] Vérifier la gestion des erreurs (téléphone déjà utilisé, champs manquants, etc.)

---

## 🎨 Design et UX - Rappels importants

### Couleurs et styles
- **Orange gradient** : `from-orange-500 to-orange-400` (principal)
- **Emerald** : `border-emerald-500/30`, `bg-emerald-500/10`, `text-emerald-300` (succès, Joueur 2)
- **Rose** : `border-rose-400/40`, `bg-rose-500/10`, `text-rose-300` (retirer binôme)
- **Background** : `linear-gradient(135deg, #1E1E2E 0%, #2A2A3E 100%)`

### Responsive
- **Mobile** : Formulaires empilés verticalement
- **Desktop (lg+)** : `lg:grid lg:grid-cols-2 lg:gap-6` pour afficher côte à côte
- **Container max-width** : 600px en solo, 1400px en binôme

### Icônes
- **Binôme** : 👥
- **Joueur 1** : Badge orange avec icône utilisateur
- **Joueur 2** : Badge emerald avec icône utilisateur
- **Ajouter** : `+` (svg path: "M12 4v16m8-8H4")
- **Retirer** : `×` (svg path: "M6 18L18 6M6 6l12 12")

---

## 📝 Notes supplémentaires

1. **Upload de photos** : L'implémentation complète de l'upload vers Supabase Storage est à finaliser (ligne TODO dans `registerPairAction`)

2. **Validation côté client** : Ajouter des validations supplémentaires avec `react-hook-form` si nécessaire

3. **Gestion du lien WhatsApp** : Après inscription en binôme, afficher le lien WhatsApp avec le composant `WhatsAppGroupSection` existant

4. **Notifications** : Utiliser le composant `Toast` pour afficher les messages de succès/erreur

5. **Tests unitaires** : Écrire des tests pour `registerPairAction` avec Jest

6. **Performance** : Optimiser les requêtes SQL en utilisant des transactions pour l'inscription en binôme

---

## 🚀 Commandes utiles

```bash
# Appliquer la migration
psql -U postgres -d padel_tournaments -f /database/migrations/2026-02-17-add-pair-with-to-players.sql

# Vérifier la structure de la table players
psql -U postgres -d padel_tournaments -c "\d players"

# Tester une requête SELECT
psql -U postgres -d padel_tournaments -c "SELECT id, first_name, last_name, pair_with FROM players LIMIT 5;"

# Redémarrer le serveur Next.js
npm run dev
```

---

## 📚 Ressources

- Documentation Next.js Server Actions : https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
- Documentation Tailwind CSS : https://tailwindcss.com/docs
- Documentation PostgreSQL : https://www.postgresql.org/docs/

---

**Fin du prompt d'implémentation**
