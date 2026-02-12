# Prompt Roo : Implémentation Formulaire d'Inscription avec Utilisateur Existant

## Contexte
Implémentation d'un système d'inscription aux tournois permettant aux utilisateurs de se rattacher à leur compte existant (via email) ou de créer un nouveau compte. Cette feature permet de compiler les statistiques d'un joueur à travers plusieurs tournois.

## Fichiers de Référence

### Design et Spécifications (À LIRE EN PRIORITÉ)
1. **`/mnt/padel/formulaire-inscription-demo.html`** : HTML de référence complet avec :
   - Switch OUI/NON (Première fois / Déjà joué)
   - 4 états du formulaire (nouveau, vérification email, succès, erreur)
   - Upload de photo avec drag & drop
   - Design final avec charte Proposition 3
   - Tous les messages et validations

2. **`/mnt/padel/SPEC-inscription-utilisateur-existant.md`** : Spécification complète avec :
   - 3 parcours utilisateur détaillés
   - Spécifications techniques frontend/backend
   - Structure de base de données
   - Messages utilisateur
   - Cas limites et edge cases
   - Tests à effectuer

### Fichiers Existants à Modifier
3. **`src/lib/storage-helpers.ts`** : Déjà implémenté pour stockage local (file system)
4. **`src/app/actions/photo-actions.ts`** : Actions serveur pour gestion photos
5. **`src/components/ui/ImageDropzone.tsx`** (si existe, sinon à créer)

## Architecture Technique

### Base de Données

#### Contraintes à Ajouter

```sql
-- 1. Email unique sur players (case insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_email_unique
ON players (lower(email));

-- 2. Participation unique par joueur/tournoi
CREATE UNIQUE INDEX IF NOT EXISTS idx_participations_unique
ON participations (tournament_id, player_id);

-- 3. Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_participations_player ON participations(player_id);
CREATE INDEX IF NOT EXISTS idx_participations_status ON participations(status);
CREATE INDEX IF NOT EXISTS idx_participations_tournament ON participations(tournament_id);
```

#### Vérification des Doublons Existants

Avant d'ajouter la contrainte d'unicité sur l'email, vérifier et nettoyer les doublons :

```sql
-- Identifier les doublons
SELECT lower(email) as email_lower, count(*) as count
FROM players
GROUP BY lower(email)
HAVING count(*) > 1;

-- Pour chaque doublon identifié, fusionner manuellement :
-- 1. Identifier l'ID à garder (le plus ancien)
-- 2. Migrer les participations
-- 3. Supprimer les doublons
```

#### Ajout de Champs (si manquants)

```sql
-- Ajouter photo_url et photo_path sur players si pas déjà présents
ALTER TABLE players ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS photo_path TEXT;

-- Ajouter created_at pour pouvoir identifier le plus ancien en cas de doublon
ALTER TABLE players ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

### Backend

#### 1. Nouvelle Route : Vérification Email

**Fichier** : `src/app/api/tournaments/[tournamentId]/verify-email/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/database";

export async function POST(
  req: NextRequest,
  { params }: { params: { tournamentId: string } }
) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email requis" },
        { status: 400 }
      );
    }

    const database = getDatabaseClient();

    // Chercher le joueur par email (case insensitive)
    const [player] = await database<
      {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        photo_url: string | null;
        level: string | null;
        tournament_count: string; // count
      }[]
    >`
      SELECT
        p.id,
        p.first_name,
        p.last_name,
        p.email,
        p.photo_url,
        p.level,
        COUNT(DISTINCT part.tournament_id)::text as tournament_count
      FROM players p
      LEFT JOIN participations part ON part.player_id = p.id
      WHERE LOWER(p.email) = LOWER(${email.trim()})
      GROUP BY p.id, p.first_name, p.last_name, p.email, p.photo_url, p.level
      LIMIT 1
    `;

    if (!player) {
      return NextResponse.json(
        { success: false, error: "Aucun compte trouvé avec cet email" },
        { status: 404 }
      );
    }

    // Vérifier si déjà inscrit à ce tournoi
    const [existing] = await database`
      SELECT id
      FROM participations
      WHERE tournament_id = ${params.tournamentId}
        AND player_id = ${player.id}
    `;

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Vous êtes déjà inscrit à ce tournoi" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      player: {
        id: player.id,
        firstName: player.first_name,
        lastName: player.last_name,
        email: player.email,
        photoUrl: player.photo_url,
        level: player.level,
        previousTournaments: parseInt(player.tournament_count),
      },
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
```

#### 2. Modification Route d'Inscription

**Fichier** : `src/app/api/tournaments/[tournamentId]/register/route.ts` (ou actions)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/database";
import { uploadImage, validateImageFile } from "@/lib/storage-helpers";

type RegistrationMode = "new" | "existing";

interface NewPlayerData {
  mode: "new";
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  level: string;
  photo?: File;
}

interface ExistingPlayerData {
  mode: "existing";
  playerId: string;
  email: string;
}

type RegistrationData = NewPlayerData | ExistingPlayerData;

export async function POST(
  req: NextRequest,
  { params }: { params: { tournamentId: string } }
) {
  try {
    const formData = await req.formData();
    const mode = formData.get("mode") as RegistrationMode;

    const database = getDatabaseClient();
    let playerId: string;

    if (mode === "new") {
      // Nouveau joueur
      const email = String(formData.get("email") || "").trim();
      const firstName = String(formData.get("firstName") || "").trim();
      const lastName = String(formData.get("lastName") || "").trim();
      const phone = String(formData.get("phone") || "").trim() || null;
      const level = String(formData.get("level") || "").trim();
      const photo = formData.get("photo") as File | null;

      // Validation
      if (!email || !firstName || !lastName || !level) {
        return NextResponse.json(
          { success: false, error: "Champs requis manquants" },
          { status: 400 }
        );
      }

      // Vérifier que l'email n'existe pas déjà
      const [existing] = await database`
        SELECT id FROM players WHERE LOWER(email) = LOWER(${email})
      `;

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Cet email est déjà utilisé. Utilisez le mode 'Déjà joué' pour vous rattacher à votre compte.",
          },
          { status: 400 }
        );
      }

      // Upload photo si fournie
      let photoUrl: string | null = null;
      let photoPath: string | null = null;

      if (photo && photo.size > 0) {
        const validation = validateImageFile(photo);
        if (!validation.valid) {
          return NextResponse.json(
            { success: false, error: validation.error },
            { status: 400 }
          );
        }

        const result = await uploadImage(photo, "player-photos");
        photoUrl = result.url;
        photoPath = result.path;
      }

      // Créer le joueur
      const [newPlayer] = await database<{ id: string }[]>`
        INSERT INTO players (first_name, last_name, email, phone, level, photo_url, photo_path, created_at)
        VALUES (${firstName}, ${lastName}, ${email}, ${phone}, ${level}, ${photoUrl}, ${photoPath}, NOW())
        RETURNING id
      `;

      playerId = newPlayer.id;
    } else if (mode === "existing") {
      // Joueur existant
      playerId = String(formData.get("playerId") || "");
      const email = String(formData.get("email") || "").trim();

      if (!playerId || !email) {
        return NextResponse.json(
          { success: false, error: "Données manquantes" },
          { status: 400 }
        );
      }

      // Vérifier que le joueur existe
      const [player] = await database`
        SELECT id FROM players WHERE id = ${playerId} AND LOWER(email) = LOWER(${email})
      `;

      if (!player) {
        return NextResponse.json(
          { success: false, error: "Joueur non trouvé" },
          { status: 404 }
        );
      }

      // Vérifier qu'il n'est pas déjà inscrit
      const [existingParticipation] = await database`
        SELECT id FROM participations
        WHERE tournament_id = ${params.tournamentId}
          AND player_id = ${playerId}
      `;

      if (existingParticipation) {
        return NextResponse.json(
          { success: false, error: "Vous êtes déjà inscrit à ce tournoi" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Mode invalide" },
        { status: 400 }
      );
    }

    // Créer la participation (status = 'pending')
    await database`
      INSERT INTO participations (tournament_id, player_id, status, created_at)
      VALUES (${params.tournamentId}, ${playerId}, 'pending', NOW())
    `;

    // TODO: Envoyer email de confirmation
    // await sendConfirmationEmail(playerId, params.tournamentId);

    return NextResponse.json({
      success: true,
      message: "Inscription réussie ! En attente de validation.",
    });
  } catch (error) {
    console.error("Error registering to tournament:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de l'inscription" },
      { status: 500 }
    );
  }
}
```

### Frontend

#### 1. Composant Principal : RegisterForm

**Fichier** : `src/components/tournaments/RegisterForm.tsx`

Structure basée sur `formulaire-inscription-demo.html` :

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type RegistrationMode = "new" | "existing";

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl: string | null;
  level: string | null;
  previousTournaments: number;
};

type RegisterFormProps = {
  tournamentId: string;
  tournamentName: string;
};

export function RegisterForm({ tournamentId, tournamentName }: RegisterFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // State
  const [mode, setMode] = useState<RegistrationMode>("new");
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifiedPlayer, setVerifiedPlayer] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Form fields (mode new)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [level, setLevel] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  // Verify email (mode existing)
  const handleVerifyEmail = async () => {
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError("Veuillez entrer une adresse email");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/tournaments/${tournamentId}/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });

        const data = await response.json();

        if (data.success) {
          setEmailVerified(true);
          setVerifiedPlayer(data.player);
          setMessage(`✓ Compte trouvé : ${data.player.firstName} ${data.player.lastName}`);
        } else {
          setError(data.error || "Erreur lors de la vérification");
        }
      } catch (err) {
        setError("Erreur de connexion au serveur");
      }
    });
  };

  // Submit registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const formData = new FormData();

    if (mode === "new") {
      // Validation
      if (!firstName.trim() || !lastName.trim() || !email.trim() || !level) {
        setError("Veuillez remplir tous les champs requis");
        return;
      }

      formData.append("mode", "new");
      formData.append("firstName", firstName.trim());
      formData.append("lastName", lastName.trim());
      formData.append("email", email.trim());
      formData.append("phone", phone.trim());
      formData.append("level", level);
      if (photo) {
        formData.append("photo", photo);
      }
    } else if (mode === "existing") {
      if (!emailVerified || !verifiedPlayer) {
        setError("Veuillez d'abord vérifier votre email");
        return;
      }

      formData.append("mode", "existing");
      formData.append("playerId", verifiedPlayer.id);
      formData.append("email", email.trim());
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/tournaments/${tournamentId}/register`, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          setMessage(data.message);
          // Rediriger après 2 secondes
          setTimeout(() => {
            router.push(`/tournaments/${tournamentId}`);
          }, 2000);
        } else {
          setError(data.error || "Erreur lors de l'inscription");
        }
      } catch (err) {
        setError("Erreur de connexion au serveur");
      }
    });
  };

  // Reset to new mode
  const handleResetToNew = () => {
    setMode("new");
    setEmail("");
    setEmailVerified(false);
    setVerifiedPlayer(null);
    setError(null);
    setMessage(null);
  };

  // Reset verification
  const handleResetVerification = () => {
    setEmailVerified(false);
    setVerifiedPlayer(null);
    setError(null);
    setMessage(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Inscription au Tournoi
        </h1>
        <p className="text-white/60">{tournamentName}</p>
      </div>

      {/* Toggle Switch */}
      <div className="mb-8 p-6 rounded-xl border border-white/10 bg-white/5">
        <label className="block text-base font-semibold text-white mb-4">
          Avez-vous déjà participé à un tournoi ?
        </label>
        {/* Implémenter le switch basé sur le HTML de référence */}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Implémenter tous les champs basés sur le HTML de référence */}
        {/* Voir formulaire-inscription-demo.html pour la structure complète */}
      </form>
    </div>
  );
}
```

**IMPORTANT** : Reprendre EXACTEMENT la structure, les états et la logique du fichier `formulaire-inscription-demo.html`. Ne pas réinventer, simplement convertir en React/Next.js.

#### 2. Composant Upload Photo

**Fichier** : `src/components/ui/PhotoUpload.tsx`

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Camera } from "lucide-react";

type PhotoUploadProps = {
  onPhotoSelected: (file: File | null) => void;
  currentPhotoUrl?: string | null;
  disabled?: boolean;
};

export function PhotoUpload({
  onPhotoSelected,
  currentPhotoUrl,
  disabled = false,
}: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Format non supporté. Utilisez JPG, PNG ou WebP.");
      return false;
    }

    if (file.size > maxSize) {
      setError("Image trop volumineuse. Maximum 5MB.");
      return false;
    }

    setError(null);
    return true;
  };

  const handleFileChange = (file: File) => {
    if (!validateFile(file)) return;

    onPhotoSelected(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onPhotoSelected(null);
    setError(null);
  };

  // Implémenter drag & drop et le reste basé sur formulaire-inscription-demo.html

  return (
    <div className="space-y-2">
      {/* Structure identique au HTML de référence */}
    </div>
  );
}
```

### Implications KPI Home Page

#### Requêtes à Mettre à Jour

Avec les utilisateurs qui peuvent participer à plusieurs tournois, les KPIs doivent être recalculés différemment :

**1. Classement des Paires**

```typescript
// AVANT : Une paire = 1 team_id unique
// APRÈS : Une paire = 2 player_id qui jouent ensemble

async function getPairRankings() {
  const database = getDatabaseClient();

  // Identifier toutes les paires (combinaisons de 2 joueurs)
  const pairs = await database`
    WITH player_pairs AS (
      SELECT DISTINCT
        LEAST(tm1.player_id, tm2.player_id) as player1_id,
        GREATEST(tm1.player_id, tm2.player_id) as player2_id,
        t.id as team_id
      FROM team_members tm1
      JOIN team_members tm2 ON tm1.team_id = tm2.team_id AND tm1.player_id < tm2.player_id
      JOIN teams t ON t.id = tm1.team_id
    ),
    pair_stats AS (
      SELECT
        pp.player1_id,
        pp.player2_id,
        COUNT(DISTINCT CASE WHEN m.winner_id = pp.team_id THEN m.tournament_id END) as tournaments_won,
        COUNT(DISTINCT CASE WHEN m.winner_id = pp.team_id THEN m.id END) as matches_won,
        COUNT(DISTINCT m.id) as matches_played,
        COUNT(DISTINCT s.id) FILTER (WHERE m.winner_id = pp.team_id) as sets_won,
        COUNT(DISTINCT s.id) as sets_played
      FROM player_pairs pp
      LEFT JOIN matches m ON m.team1_id = pp.team_id OR m.team2_id = pp.team_id
      LEFT JOIN sets s ON s.match_id = m.id
      WHERE m.status = 'completed'
      GROUP BY pp.player1_id, pp.player2_id
    )
    SELECT
      ps.*,
      p1.first_name as player1_first_name,
      p1.last_name as player1_last_name,
      p1.photo_url as player1_photo_url,
      p2.first_name as player2_first_name,
      p2.last_name as player2_last_name,
      p2.photo_url as player2_photo_url
    FROM pair_stats ps
    JOIN players p1 ON p1.id = ps.player1_id
    JOIN players p2 ON p2.id = ps.player2_id
    ORDER BY ps.tournaments_won DESC, ps.matches_won DESC, (ps.sets_won::float / NULLIF(ps.sets_played, 0)) DESC
    LIMIT 10
  `;

  return pairs;
}
```

**2. Classement des Joueurs Individuels**

```typescript
async function getPlayerRankings() {
  const database = getDatabaseClient();

  const players = await database`
    WITH player_stats AS (
      SELECT
        p.id as player_id,
        p.first_name,
        p.last_name,
        p.photo_url,
        p.level,
        COUNT(DISTINCT CASE WHEN m.winner_id IN (
          SELECT team_id FROM team_members WHERE player_id = p.id
        ) THEN m.tournament_id END) as tournaments_won,
        COUNT(DISTINCT CASE WHEN m.winner_id IN (
          SELECT team_id FROM team_members WHERE player_id = p.id
        ) THEN m.id END) as matches_won,
        COUNT(DISTINCT m.id) as matches_played,
        COUNT(DISTINCT part.tournament_id) as tournaments_participated
      FROM players p
      LEFT JOIN participations part ON part.player_id = p.id
      LEFT JOIN team_members tm ON tm.player_id = p.id
      LEFT JOIN matches m ON (m.team1_id = tm.team_id OR m.team2_id = tm.team_id)
        AND m.status = 'completed'
      GROUP BY p.id, p.first_name, p.last_name, p.photo_url, p.level
      HAVING COUNT(DISTINCT part.tournament_id) > 0
    )
    SELECT *
    FROM player_stats
    ORDER BY tournaments_won DESC, matches_won DESC, matches_played DESC
    LIMIT 10
  `;

  return players;
}
```

**3. Stats Globales**

```typescript
// Le nombre de joueurs actifs change :
// AVANT : Compter les players avec au moins 1 participation
// APRÈS : Même logique, mais peut avoir plusieurs participations

const [playersCount] = await database<{ count: string }[]>`
  SELECT COUNT(DISTINCT player_id)::text as count
  FROM participations
  WHERE status IN ('confirmed', 'completed')
`;
```

**4. Polyvalence (Nouveaux Partenaires)**

```typescript
// KPI : Joueurs ayant joué avec le plus de partenaires différents
async function getMostVersatilePlayers() {
  const database = getDatabaseClient();

  const players = await database`
    WITH player_partners AS (
      SELECT
        tm1.player_id,
        COUNT(DISTINCT tm2.player_id) as partner_count
      FROM team_members tm1
      JOIN team_members tm2 ON tm1.team_id = tm2.team_id AND tm1.player_id != tm2.player_id
      GROUP BY tm1.player_id
      HAVING COUNT(DISTINCT tm2.player_id) > 1
    )
    SELECT
      pp.player_id,
      p.first_name,
      p.last_name,
      p.photo_url,
      pp.partner_count
    FROM player_partners pp
    JOIN players p ON p.id = pp.player_id
    ORDER BY pp.partner_count DESC
    LIMIT 10
  `;

  return players;
}
```

### Structure des Dossiers

```
src/
  app/
    api/
      tournaments/
        [tournamentId]/
          verify-email/
            route.ts (NOUVEAU)
          register/
            route.ts (MODIFIER)
    tournaments/
      [tournamentId]/
        register/
          page.tsx (CRÉER/MODIFIER)
  components/
    tournaments/
      RegisterForm.tsx (CRÉER)
    ui/
      PhotoUpload.tsx (CRÉER)
  lib/
    storage-helpers.ts (DÉJÀ FAIT - file system local)

public/
  uploads/
    player-photos/ (créer le dossier)
      .gitkeep
```

## Checklist d'Implémentation

### Phase 1 : Base de Données
- [ ] Exécuter les migrations SQL (contraintes, indexes)
- [ ] Vérifier et nettoyer les doublons d'email existants
- [ ] Ajouter photo_url et photo_path sur players si manquants
- [ ] Tester les contraintes (essayer d'insérer des doublons)

### Phase 2 : Backend
- [ ] Créer la route `/api/tournaments/[id]/verify-email`
- [ ] Modifier/créer la route `/api/tournaments/[id]/register`
- [ ] Tester verify-email avec Postman/Thunder Client
- [ ] Tester register en mode "new"
- [ ] Tester register en mode "existing"
- [ ] Vérifier que les contraintes DB bloquent bien les doublons

### Phase 3 : Upload Photo
- [ ] Créer les dossiers `public/uploads/player-photos/`
- [ ] Ajouter .gitkeep et configurer .gitignore
- [ ] Vérifier que storage-helpers.ts fonctionne (déjà implémenté)
- [ ] Tester upload d'une image
- [ ] Vérifier que l'image est bien enregistrée dans public/uploads/
- [ ] Vérifier que l'URL est accessible (http://localhost:3000/uploads/player-photos/...)

### Phase 4 : Frontend
- [ ] Créer le composant PhotoUpload.tsx
- [ ] Créer le composant RegisterForm.tsx
- [ ] Créer la page /tournaments/[id]/register
- [ ] Implémenter le switch OUI/NON
- [ ] Implémenter les 4 états (nouveau, vérification, succès, erreur)
- [ ] Implémenter l'upload de photo avec preview
- [ ] Ajouter toutes les validations côté client
- [ ] Tester tous les parcours utilisateur

### Phase 5 : KPI Home Page
- [ ] Mettre à jour getPairRankings() pour gérer les paires multi-tournois
- [ ] Mettre à jour getPlayerRankings() pour les stats individuelles
- [ ] Mettre à jour getGlobalStats() si nécessaire
- [ ] Créer getMostVersatilePlayers() pour le KPI polyvalence
- [ ] Tester que les stats sont cohérentes

### Phase 6 : Tests
- [ ] Tester le parcours "Nouveau participant" complet
- [ ] Tester le parcours "Participant existant - succès"
- [ ] Tester le parcours "Participant existant - échec"
- [ ] Tester avec email avec casse différente (user@test.com vs USER@TEST.COM)
- [ ] Tester avec espaces dans l'email
- [ ] Tester upload photo (formats valides et invalides)
- [ ] Tester que les doublons sont bien bloqués
- [ ] Tester qu'un joueur ne peut pas s'inscrire 2 fois au même tournoi

### Phase 7 : Polish
- [ ] Vérifier tous les messages d'erreur
- [ ] Vérifier les messages de succès
- [ ] Ajouter les animations (loading, transitions)
- [ ] Tester sur mobile
- [ ] Vérifier l'accessibilité (keyboard, screen reader)

## Points d'Attention Critiques

### 1. Email Case Insensitive
**TOUJOURS** utiliser `LOWER(email)` dans les requêtes :
```sql
WHERE LOWER(email) = LOWER(${emailInput})
```

### 2. Trim des Emails
**TOUJOURS** trim les emails avant de les enregistrer :
```typescript
email.trim()
```

### 3. Contrainte d'Unicité
La contrainte `idx_players_email_unique` sur `lower(email)` empêchera les doublons automatiquement. Bien gérer l'erreur SQL pour retourner un message user-friendly.

### 4. Migration des Doublons
Si des doublons existent déjà, **NE PAS** simplement les supprimer. Il faut :
1. Identifier le compte à garder (le plus ancien)
2. Migrer toutes les participations vers ce compte
3. Supprimer les doublons

### 5. Photos et File System
- Les images sont stockées dans `public/uploads/`
- Les URLs sont de type `/uploads/player-photos/123-abc.jpg`
- Next.js sert automatiquement les fichiers dans `public/`
- Sur Vercel, utiliser Vercel Blob Storage (voir prompt-roo-fix-photo-storage-local.md)

### 6. KPIs et Paires Multi-Tournois
Avec les joueurs qui peuvent participer à plusieurs tournois, les "paires" ne sont plus figées :
- Une paire = 2 joueurs qui jouent ensemble dans UNE team
- Les mêmes 2 joueurs peuvent former plusieurs teams dans différents tournois
- Les stats doivent agréger toutes les teams où ces 2 joueurs sont ensemble

### 7. Performance
Avec les nouvelles requêtes complexes (paires, partners, etc.), **ajouter les indexes** recommandés dans la spec.

### 8. Sécurité Upload
Le composant PhotoUpload doit valider :
- Type MIME (image/jpeg, image/png, image/webp)
- Taille max (5MB)
- Côté client ET côté serveur (double validation)

## Messages Utilisateur (À Reprendre Exactement)

### Info
- "Utilisez l'adresse email de votre première inscription pour retrouver votre compte et compiler vos statistiques."

### Succès
- "✓ Compte trouvé : [Prénom Nom]"
- "✓ Inscription réussie ! Votre demande est en attente de validation."
- "✓ Inscription réussie avec photo ! Votre demande est en attente de validation."

### Erreurs
- "✗ Aucun compte trouvé avec cet email. Vérifiez votre adresse ou inscrivez-vous comme nouveau participant."
- "Cet email est déjà utilisé. Utilisez le mode 'Déjà joué' pour vous rattacher à votre compte."
- "Vous êtes déjà inscrit à ce tournoi"
- "Veuillez entrer une adresse email valide"
- "Format non supporté. Utilisez JPG, PNG ou WebP."
- "Image trop volumineuse. Maximum 5MB."

## Commandes Utiles

```bash
# Créer les dossiers uploads
mkdir -p public/uploads/player-photos
touch public/uploads/player-photos/.gitkeep

# Vérifier les doublons en DB
psql $DATABASE_URL -c "SELECT lower(email), count(*) FROM players GROUP BY lower(email) HAVING count(*) > 1;"

# Tester l'upload (Thunder Client ou curl)
curl -X POST http://localhost:3000/api/tournaments/[ID]/register \
  -F "mode=new" \
  -F "firstName=John" \
  -F "lastName=Doe" \
  -F "email=john@test.com" \
  -F "level=intermediate" \
  -F "photo=@/path/to/photo.jpg"
```

## Référence Design (Charte Proposition 3)

- Orange : #ff6b35 → #ff8c42 (gradient)
- Vert : #4CAF50
- Violet : #9D7AFA
- Fond : #1E1E2E
- Transparence : bg-white/5, bg-white/10
- Bordures : border-white/10

## Ordre d'Implémentation Recommandé

1. **Backend d'abord** (verify-email + register)
2. **Tests API** avec Postman
3. **Upload photo** (storage + tests)
4. **Frontend** (composants + page)
5. **Tests E2E** (tous les parcours)
6. **KPIs** (requêtes mises à jour)
7. **Polish** (messages, animations, responsive)

**IMPORTANT** : Ne pas hésiter à se référer constamment aux fichiers de référence (`formulaire-inscription-demo.html` et `SPEC-inscription-utilisateur-existant.md`). Ils contiennent tous les détails d'implémentation, les cas limites, et les messages exacts à utiliser.
