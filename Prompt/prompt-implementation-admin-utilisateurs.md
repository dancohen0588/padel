# Implémentation : Menu Admin "Utilisateurs" - Gestion Complète

## Contexte technique

**Stack :**
- Next.js 14+ avec App Router
- TypeScript (strict mode)
- PostgreSQL avec requêtes SQL directes (pas de Prisma)
- Tailwind CSS avec thème dark (#1E1E2E)
- Server Actions pour les mutations
- Upload de fichiers avec stockage local ou cloud

**Architecture existante :**
- Pages admin existantes : `/admin/paiement`, `/admin/home-photo`
- Structure des types dans `/src/lib/types.ts`
- Server Actions dans `/src/app/actions/`
- Composants UI dans `/src/components/ui/`
- Table `players` existante en base de données

## Objectif

Créer un **menu admin "Utilisateurs"** permettant de :
- Visualiser la liste complète de tous les utilisateurs (players)
- Rechercher et filtrer les utilisateurs
- Modifier tous les champs d'un utilisateur (prénom, nom, email, téléphone, photo)
- Gérer le statut de vérification des comptes
- Ajouter des notes administratives

Le menu doit être placé entre "Paiement" et "Home photo" dans la navigation admin.

## Validation visuelle

Un fichier HTML de validation est disponible : `/admin-utilisateurs.html`
Il montre exactement le rendu attendu avec :
- Table responsive avec tous les utilisateurs
- Recherche en temps réel
- Filtres par statut
- Modal d'édition complet avec tous les champs
- Upload de photo de profil
- Badges de statut colorés
- Pagination

## Structure des données

### Table players (existante)

```sql
-- Table players
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  photo_url TEXT,
  status TEXT DEFAULT 'pending', -- 'verified', 'pending', 'suspended'
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches
CREATE INDEX idx_players_email ON players(email);
CREATE INDEX idx_players_name ON players(first_name, last_name);
CREATE INDEX idx_players_status ON players(status);
CREATE INDEX idx_players_created_at ON players(created_at DESC);
```

### Migration SQL si colonnes manquantes

```sql
-- Ajouter les colonnes si elles n'existent pas
ALTER TABLE players ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE players ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Trigger pour updated_at automatique
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Types TypeScript

Mettre à jour `/src/lib/types.ts` :

```typescript
export type Player = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  photo_url?: string | null;
  status?: 'verified' | 'pending' | 'suspended';
  admin_notes?: string | null;
  created_at: string;
  updated_at?: string;
};

export type PlayerWithStats = Player & {
  tournaments_count?: number;
  registrations_count?: number;
};
```

## Implémentation

### 1. Server Actions pour les utilisateurs

Créer `/src/app/actions/users.ts` :

```typescript
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { Player } from "@/lib/types";

export async function getAllPlayersAction(
  adminToken: string,
  search?: string,
  status?: string,
  page: number = 1,
  limit: number = 10
): Promise<{
  players: Player[];
  total: number;
  page: number;
  totalPages: number;
}> {
  try {
    // Vérifier le token admin (à adapter selon votre logique d'authentification)
    // TODO: Implémenter la vérification du token admin

    let query = `SELECT * FROM players WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    // Recherche
    if (search && search.trim()) {
      query += ` AND (
        LOWER(first_name) LIKE LOWER($${paramIndex})
        OR LOWER(last_name) LIKE LOWER($${paramIndex})
        OR LOWER(email) LIKE LOWER($${paramIndex})
        OR phone LIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Filtre par statut
    if (status && status !== 'all') {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Compter le total
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM (${query}) as filtered`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Pagination
    const offset = (page - 1) * limit;
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    return {
      players: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("[getAllPlayersAction] error:", error);
    throw new Error("Erreur lors de la récupération des utilisateurs");
  }
}

export async function updatePlayerAction(
  playerId: string,
  data: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    photo_url?: string;
    status?: string;
    admin_notes?: string;
  },
  adminToken: string
): Promise<{ success: boolean; error?: string; player?: Player }> {
  try {
    // Vérifier le token admin
    // TODO: Implémenter la vérification du token admin

    // Vérifier que le player existe
    const existingPlayer = await db.query(
      `SELECT id FROM players WHERE id = $1`,
      [playerId]
    );

    if (!existingPlayer.rows[0]) {
      return { success: false, error: "Utilisateur non trouvé" };
    }

    // Construire la requête de mise à jour dynamiquement
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.first_name !== undefined) {
      updates.push(`first_name = $${paramIndex}`);
      values.push(data.first_name);
      paramIndex++;
    }

    if (data.last_name !== undefined) {
      updates.push(`last_name = $${paramIndex}`);
      values.push(data.last_name);
      paramIndex++;
    }

    if (data.email !== undefined) {
      // Vérifier l'unicité de l'email
      const emailCheck = await db.query(
        `SELECT id FROM players WHERE email = $1 AND id != $2`,
        [data.email, playerId]
      );

      if (emailCheck.rows.length > 0) {
        return { success: false, error: "Cet email est déjà utilisé" };
      }

      updates.push(`email = $${paramIndex}`);
      values.push(data.email);
      paramIndex++;
    }

    if (data.phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      values.push(data.phone);
      paramIndex++;
    }

    if (data.photo_url !== undefined) {
      updates.push(`photo_url = $${paramIndex}`);
      values.push(data.photo_url);
      paramIndex++;
    }

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(data.status);
      paramIndex++;
    }

    if (data.admin_notes !== undefined) {
      updates.push(`admin_notes = $${paramIndex}`);
      values.push(data.admin_notes);
      paramIndex++;
    }

    if (updates.length === 0) {
      return { success: false, error: "Aucune modification à effectuer" };
    }

    // Ajouter playerId comme dernier paramètre
    values.push(playerId);

    const query = `
      UPDATE players
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);

    revalidatePath("/admin/users");

    return {
      success: true,
      player: result.rows[0],
    };
  } catch (error) {
    console.error("[updatePlayerAction] error:", error);
    return { success: false, error: "Erreur lors de la mise à jour" };
  }
}

export async function uploadPlayerPhotoAction(
  playerId: string,
  formData: FormData,
  adminToken: string
): Promise<{ success: boolean; error?: string; photoUrl?: string }> {
  try {
    // Vérifier le token admin
    // TODO: Implémenter la vérification du token admin

    const file = formData.get("photo") as File;

    if (!file) {
      return { success: false, error: "Aucun fichier fourni" };
    }

    // Vérifier le type de fichier
    if (!file.type.startsWith("image/")) {
      return { success: false, error: "Le fichier doit être une image" };
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "L'image ne doit pas dépasser 5 Mo" };
    }

    // TODO: Implémenter l'upload vers votre service de stockage
    // Option 1: Stockage local dans /public/uploads/players/
    // Option 2: Stockage cloud (AWS S3, Cloudinary, etc.)

    // Exemple avec stockage local :
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fs = require("fs").promises;
    const path = require("path");

    // Créer le dossier si nécessaire
    const uploadDir = path.join(process.cwd(), "public", "uploads", "players");
    await fs.mkdir(uploadDir, { recursive: true });

    // Générer un nom de fichier unique
    const ext = file.name.split(".").pop();
    const filename = `${playerId}-${Date.now()}.${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Écrire le fichier
    await fs.writeFile(filepath, buffer);

    const photoUrl = `/uploads/players/${filename}`;

    // Mettre à jour le player avec la nouvelle URL
    await db.query(
      `UPDATE players SET photo_url = $1, updated_at = NOW() WHERE id = $2`,
      [photoUrl, playerId]
    );

    revalidatePath("/admin/users");

    return { success: true, photoUrl };
  } catch (error) {
    console.error("[uploadPlayerPhotoAction] error:", error);
    return { success: false, error: "Erreur lors de l'upload de la photo" };
  }
}

export async function deletePlayerAction(
  playerId: string,
  adminToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Vérifier le token admin
    // TODO: Implémenter la vérification du token admin

    // Vérifier que le player n'a pas de registrations actives
    const registrations = await db.query(
      `SELECT COUNT(*) as count FROM registrations WHERE player_id = $1`,
      [playerId]
    );

    if (parseInt(registrations.rows[0].count) > 0) {
      return {
        success: false,
        error: "Impossible de supprimer un utilisateur avec des inscriptions actives",
      };
    }

    // Supprimer le player
    await db.query(`DELETE FROM players WHERE id = $1`, [playerId]);

    revalidatePath("/admin/users");

    return { success: true };
  } catch (error) {
    console.error("[deletePlayerAction] error:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }
}
```

### 2. Page Admin Utilisateurs

Créer `/src/app/admin/users/page.tsx` :

```typescript
import { Suspense } from "react";
import { UsersManagement } from "@/components/admin/UsersManagement";
import { getAllPlayersAction } from "@/app/actions/users";

type PageProps = {
  searchParams: {
    search?: string;
    status?: string;
    page?: string;
  };
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const search = searchParams.search || "";
  const status = searchParams.status || "all";
  const page = parseInt(searchParams.page || "1");

  // TODO: Récupérer le token admin depuis les cookies ou session
  const adminToken = "YOUR_ADMIN_TOKEN";

  const data = await getAllPlayersAction(adminToken, search, status, page);

  return (
    <div className="min-h-screen bg-[#1E1E2E] p-6">
      <Suspense fallback={<div>Chargement...</div>}>
        <UsersManagement initialData={data} adminToken={adminToken} />
      </Suspense>
    </div>
  );
}

export const metadata = {
  title: "Gestion des Utilisateurs - Admin",
  description: "Administration des joueurs inscrits",
};
```

### 3. Composant UsersManagement

Créer `/src/components/admin/UsersManagement.tsx` :

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Player } from "@/lib/types";
import { updatePlayerAction, uploadPlayerPhotoAction } from "@/app/actions/users";
import { EditUserModal } from "./EditUserModal";

type UsersManagementProps = {
  initialData: {
    players: Player[];
    total: number;
    page: number;
    totalPages: number;
  };
  adminToken: string;
};

export function UsersManagement({ initialData, adminToken }: UsersManagementProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleSearch = (search: string) => {
    const params = new URLSearchParams(searchParams);
    if (search) {
      params.set("search", search);
    } else {
      params.delete("search");
    }
    params.set("page", "1");

    startTransition(() => {
      router.push(`/admin/users?${params.toString()}`);
    });
  };

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams);
    if (status && status !== "all") {
      params.set("status", status);
    } else {
      params.delete("status");
    }
    params.set("page", "1");

    startTransition(() => {
      router.push(`/admin/users?${params.toString()}`);
    });
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());

    startTransition(() => {
      router.push(`/admin/users?${params.toString()}`);
    });
  };

  const openEditModal = (player: Player) => {
    setSelectedPlayer(player);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setSelectedPlayer(null);
    setIsEditModalOpen(false);
  };

  const getInitials = (player: Player) => {
    return `${player.first_name[0] || ""}${player.last_name[0] || ""}`.toUpperCase();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? "s" : ""}`;
    return `Il y a ${Math.floor(diffDays / 30)} mois`;
  };

  return (
    <div className="mx-auto max-w-7xl">
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="mb-2 bg-gradient-to-br from-orange-400 to-amber-200 bg-clip-text text-4xl font-bold text-transparent">
          Gestion des Utilisateurs
        </h1>
        <p className="text-white/60">Administration complète de tous les joueurs inscrits</p>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Recherche */}
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                className="w-80 rounded-xl border border-white/10 bg-white/5 px-4 py-3 pl-10 text-sm text-white placeholder:text-white/30 focus:border-orange-400 focus:outline-none"
                defaultValue={searchParams.get("search") || ""}
                onChange={(e) => {
                  const timer = setTimeout(() => handleSearch(e.target.value), 500);
                  return () => clearTimeout(timer);
                }}
              />
              <svg
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Filtre statut */}
            <select
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-orange-400 focus:outline-none"
              defaultValue={searchParams.get("status") || "all"}
              onChange={(e) => handleStatusFilter(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="verified">✓ Vérifiés</option>
              <option value="pending">⏳ En attente</option>
              <option value="suspended">🚫 Suspendus</option>
            </select>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4">
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-center">
              <div className="text-2xl font-bold text-emerald-400">{initialData.total}</div>
              <div className="text-xs text-white/60">Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Table des utilisateurs */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10 bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/60">
                  Utilisateur
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/60">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/60">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/60">
                  Inscription
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-white/60">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {initialData.players.map((player) => (
                <tr
                  key={player.id}
                  className="border-l-2 border-transparent transition hover:border-orange-400/50 hover:bg-orange-500/5"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-amber-500">
                        {player.photo_url ? (
                          <img
                            src={player.photo_url}
                            alt={`${player.first_name} ${player.last_name}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg font-bold text-white">
                            {getInitials(player)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-white">
                          {player.first_name} {player.last_name}
                        </div>
                        <div className="text-xs text-white/50">ID: {player.id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-white/80">
                        <svg className="h-4 w-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        {player.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/80">
                        <svg className="h-4 w-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                        {player.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {player.status === "verified" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase text-emerald-300">
                        <span>✓</span>
                        <span>Vérifié</span>
                      </span>
                    ) : player.status === "suspended" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-red-400/40 bg-gradient-to-r from-red-500/20 to-red-400/10 px-3 py-1 text-xs font-semibold uppercase text-red-300">
                        <span>🚫</span>
                        <span>Suspendu</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-amber-400/10 px-3 py-1 text-xs font-semibold uppercase text-amber-300">
                        <span>⏳</span>
                        <span>En attente</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-white/70">
                      {new Date(player.created_at).toLocaleDateString("fr-FR")}
                    </div>
                    <div className="text-xs text-white/40">{formatDate(player.created_at)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(player)}
                        className="rounded-lg bg-orange-500/20 px-3 py-2 text-xs font-semibold text-orange-300 transition hover:bg-orange-500/30"
                      >
                        ✏️ Modifier
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-white/10 bg-white/5 px-6 py-4">
          <div className="text-sm text-white/60">
            Affichage de <span className="font-semibold text-white">{(initialData.page - 1) * 10 + 1}</span>-
            <span className="font-semibold text-white">
              {Math.min(initialData.page * 10, initialData.total)}
            </span>{" "}
            sur <span className="font-semibold text-white">{initialData.total}</span> utilisateurs
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(initialData.page - 1)}
              disabled={initialData.page === 1}
              className="rounded-lg bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Précédent
            </button>
            {Array.from({ length: initialData.totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  page === initialData.page
                    ? "bg-orange-500 text-white"
                    : "bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(initialData.page + 1)}
              disabled={initialData.page === initialData.totalPages}
              className="rounded-lg bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>

      {/* Modal d'édition */}
      {selectedPlayer && (
        <EditUserModal
          player={selectedPlayer}
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          adminToken={adminToken}
        />
      )}
    </div>
  );
}
```

### 4. Composant EditUserModal

Créer `/src/components/admin/EditUserModal.tsx` :

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Player } from "@/lib/types";
import { updatePlayerAction, uploadPlayerPhotoAction } from "@/app/actions/users";

type EditUserModalProps = {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  adminToken: string;
};

export function EditUserModal({ player, isOpen, onClose, adminToken }: EditUserModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: player.first_name,
    last_name: player.last_name,
    email: player.email,
    phone: player.phone,
    status: player.status || "pending",
    admin_notes: player.admin_notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await updatePlayerAction(player.id, formData, adminToken);

      if (result.success) {
        setSuccess("Modifications enregistrées avec succès");
        setTimeout(() => {
          router.refresh();
          onClose();
        }, 1000);
      } else {
        setError(result.error || "Une erreur est survenue");
      }
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("photo", file);

    startTransition(async () => {
      const result = await uploadPlayerPhotoAction(player.id, formData, adminToken);

      if (result.success) {
        setSuccess("Photo mise à jour avec succès");
        router.refresh();
      } else {
        setError(result.error || "Erreur lors de l'upload");
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#1E1E2E] p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="bg-gradient-to-br from-orange-400 to-amber-200 bg-clip-text text-3xl font-bold text-transparent">
            Modifier l'utilisateur
          </h2>
          <button
            onClick={onClose}
            className="rounded-xl bg-white/5 p-2 text-white/60 transition hover:bg-white/10"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo de profil */}
          <div className="text-center">
            <div className="mx-auto mb-3 h-24 w-24 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-amber-500">
              {player.photo_url ? (
                <img src={player.photo_url} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                  {player.first_name[0]}
                  {player.last_name[0]}
                </div>
              )}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-orange-500/20 px-4 py-2 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/30">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Changer la photo
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
          </div>

          {/* Champs du formulaire */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/80">Prénom</label>
              <input
                type="text"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-orange-400 focus:outline-none"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/80">Nom</label>
              <input
                type="text"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-orange-400 focus:outline-none"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white/80">Email</label>
            <input
              type="email"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-orange-400 focus:outline-none"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white/80">Téléphone</label>
            <input
              type="tel"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-orange-400 focus:outline-none"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white/80">Statut</label>
            <select
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-orange-400 focus:outline-none"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="verified">✓ Vérifié</option>
              <option value="pending">⏳ En attente de vérification</option>
              <option value="suspended">🚫 Suspendu</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white/80">
              Notes administratives (optionnel)
            </label>
            <textarea
              className="min-h-[100px] w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-orange-400 focus:outline-none"
              value={formData.admin_notes}
              onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
              placeholder="Ajoutez des notes internes sur cet utilisateur..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:translate-y-[-2px] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Enregistrement..." : "💾 Enregistrer les modifications"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 5. Navigation Admin

Mettre à jour la navigation admin pour inclure le menu "Utilisateurs". Dans votre layout ou composant de navigation admin (par exemple `/src/app/admin/layout.tsx` ou composant NavBar) :

```typescript
const adminMenuItems = [
  { href: "/admin/paiement", label: "Paiement", icon: "💳" },
  { href: "/admin/users", label: "Utilisateurs", icon: "👥" }, // NOUVEAU
  { href: "/admin/home-photo", label: "Home Photo", icon: "🏠" },
  // ... autres items
];
```

## Tests à effectuer

1. ✅ Vérifier que la page `/admin/users` est accessible
2. ✅ Tester la recherche en temps réel (nom, email, téléphone)
3. ✅ Tester les filtres par statut (Vérifié / En attente / Suspendu)
4. ✅ Vérifier l'affichage des avatars (photo ou initiales)
5. ✅ Ouvrir le modal d'édition et vérifier tous les champs
6. ✅ Modifier un utilisateur et vérifier la persistence
7. ✅ Uploader une photo de profil
8. ✅ Tester la pagination (prev/next)
9. ✅ Vérifier les badges de statut colorés
10. ✅ Tester la validation des emails (unicité)
11. ✅ Vérifier les messages d'erreur et de succès
12. ✅ Tester la fermeture du modal (X, Escape, clic extérieur)

## Notes importantes

**Sécurité :**
- Implémenter une vérification robuste du token admin
- Valider tous les inputs côté serveur
- Limiter la taille des uploads de photos (5 Mo max)
- Vérifier les types MIME des images

**Performance :**
- Utiliser la pagination pour ne pas charger tous les utilisateurs
- Indexer les colonnes fréquemment recherchées
- Optimiser les requêtes SQL avec EXPLAIN ANALYZE

**UX :**
- Afficher un loader pendant les transitions
- Messages de feedback clairs (succès/erreur)
- Désactiver les boutons pendant les actions asynchrones

**Upload de photos :**
- Option 1: Stockage local dans `/public/uploads/players/`
- Option 2: Service cloud (AWS S3, Cloudinary, Vercel Blob)
- Implémenter la compression d'images côté serveur

## Référence visuelle

Ouvrir `admin-utilisateurs.html` dans un navigateur pour voir exactement le rendu final attendu avant de coder.
