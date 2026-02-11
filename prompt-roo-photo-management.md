# Prompt Roo : Système de Gestion des Photos

## Contexte
Implémentation d'un système complet de gestion des photos pour le projet "Le tournoi des frérots" incluant :
- Module d'administration pour gérer la photo de couverture et la galerie de la home page
- Système de drag & drop pour upload des images
- Galerie photo sur la page d'accueil
- Upload de photo de profil lors de l'inscription des joueurs

## Charte graphique (Proposition 3 - Hybride)
- Orange principal : #ff6b35 → #ff8c42 (gradient)
- Vert : #4CAF50
- Violet : #9D7AFA
- Jaune : #FFDA77
- Fond sombre : #1E1E2E
- Backgrounds avec transparence : bg-white/5, bg-white/10
- Bordures subtiles : border-white/10
- Hover states avec glow effect

## Architecture Technique

### 1. Storage des Images (Supabase)

#### Buckets Supabase
```sql
-- Créer les buckets de storage si non existants
-- À exécuter dans l'interface Supabase ou via migration

-- Bucket pour les photos de la home page
INSERT INTO storage.buckets (id, name, public)
VALUES ('home-photos', 'home-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket pour les photos des joueurs
INSERT INTO storage.buckets (id, name, public)
VALUES ('player-photos', 'player-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies pour home-photos (admin peut tout, public peut lire)
CREATE POLICY "Public can view home photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'home-photos');

CREATE POLICY "Authenticated users can upload home photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'home-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update home photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'home-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete home photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'home-photos' AND auth.role() = 'authenticated');

-- Policies pour player-photos
CREATE POLICY "Public can view player photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'player-photos');

CREATE POLICY "Authenticated users can upload player photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'player-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'player-photos' AND auth.role() = 'authenticated');
```

#### Table de Configuration Home Page
```sql
-- Créer une table pour stocker les configurations de la home page
CREATE TABLE IF NOT EXISTS home_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cover_photo_url TEXT, -- URL de la photo de couverture principale
  cover_photo_path TEXT, -- Chemin dans Supabase storage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Il ne devrait y avoir qu'une seule config
INSERT INTO home_config (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Table pour la galerie de photos
CREATE TABLE IF NOT EXISTS home_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_url TEXT NOT NULL,
  photo_path TEXT NOT NULL, -- Chemin dans Supabase storage
  caption TEXT, -- Légende optionnelle
  display_order INTEGER DEFAULT 0, -- Ordre d'affichage
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_gallery_order ON home_gallery(display_order);
CREATE INDEX IF NOT EXISTS idx_home_gallery_active ON home_gallery(is_active);

-- Mettre à jour users.photo_url s'il n'existe pas déjà
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_path TEXT;
```

### 2. Helpers Supabase Storage

#### src/lib/storage-helpers.ts
```typescript
import { createClient } from '@/lib/supabase/server';

/**
 * Upload une image vers Supabase Storage
 * @param file - Le fichier à uploader
 * @param bucket - Le nom du bucket ('home-photos' ou 'player-photos')
 * @param folder - Sous-dossier optionnel
 * @returns L'URL publique de l'image uploadée
 */
export async function uploadImage(
  file: File,
  bucket: 'home-photos' | 'player-photos',
  folder?: string
): Promise<{ url: string; path: string }> {
  const supabase = createClient();

  // Générer un nom unique pour éviter les collisions
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const fileExt = file.name.split('.').pop();
  const fileName = `${timestamp}-${randomStr}.${fileExt}`;
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  // Upload le fichier
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading image:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Obtenir l'URL publique
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

/**
 * Supprime une image de Supabase Storage
 * @param path - Le chemin de l'image dans le bucket
 * @param bucket - Le nom du bucket
 */
export async function deleteImage(
  path: string,
  bucket: 'home-photos' | 'player-photos'
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    console.error('Error deleting image:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}

/**
 * Valide qu'un fichier est une image valide
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Format non supporté. Utilisez JPG, PNG ou WebP.',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'L\'image est trop volumineuse. Maximum 5MB.',
    };
  }

  return { valid: true };
}
```

### 3. Server Actions pour la Gestion des Photos

#### src/app/actions/photo-actions.ts
```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { uploadImage, deleteImage } from "@/lib/storage-helpers";
import { revalidatePath } from "next/cache";

/**
 * Met à jour la photo de couverture de la home page
 */
export async function updateHomeCoverPhoto(formData: FormData) {
  const supabase = createClient();
  const file = formData.get("cover_photo") as File;

  if (!file || file.size === 0) {
    return { success: false, error: "Aucun fichier fourni" };
  }

  try {
    // Récupérer l'ancienne config pour supprimer l'ancienne photo
    const { data: oldConfig } = await supabase
      .from("home_config")
      .select("cover_photo_path")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .single();

    // Supprimer l'ancienne photo si elle existe
    if (oldConfig?.cover_photo_path) {
      await deleteImage(oldConfig.cover_photo_path, "home-photos");
    }

    // Upload la nouvelle photo
    const { url, path } = await uploadImage(file, "home-photos", "cover");

    // Mettre à jour la config
    const { error } = await supabase
      .from("home_config")
      .update({
        cover_photo_url: url,
        cover_photo_path: path,
        updated_at: new Date().toISOString(),
      })
      .eq("id", "00000000-0000-0000-0000-000000000001");

    if (error) throw error;

    revalidatePath("/");
    revalidatePath("/admin/photos");

    return { success: true, url };
  } catch (error) {
    console.error("Error updating cover photo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de l'upload",
    };
  }
}

/**
 * Ajoute une photo à la galerie
 */
export async function addGalleryPhoto(formData: FormData) {
  const supabase = createClient();
  const file = formData.get("gallery_photo") as File;
  const caption = formData.get("caption") as string;

  if (!file || file.size === 0) {
    return { success: false, error: "Aucun fichier fourni" };
  }

  try {
    // Upload la photo
    const { url, path } = await uploadImage(file, "home-photos", "gallery");

    // Récupérer l'ordre max actuel
    const { data: maxOrder } = await supabase
      .from("home_gallery")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrder?.display_order ?? -1) + 1;

    // Insérer dans la base
    const { error } = await supabase.from("home_gallery").insert({
      photo_url: url,
      photo_path: path,
      caption: caption || null,
      display_order: nextOrder,
      is_active: true,
    });

    if (error) throw error;

    revalidatePath("/");
    revalidatePath("/admin/photos");

    return { success: true, url };
  } catch (error) {
    console.error("Error adding gallery photo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de l'upload",
    };
  }
}

/**
 * Supprime une photo de la galerie
 */
export async function deleteGalleryPhoto(photoId: string) {
  const supabase = createClient();

  try {
    // Récupérer le path pour supprimer du storage
    const { data: photo } = await supabase
      .from("home_gallery")
      .select("photo_path")
      .eq("id", photoId)
      .single();

    if (!photo) {
      return { success: false, error: "Photo non trouvée" };
    }

    // Supprimer du storage
    await deleteImage(photo.photo_path, "home-photos");

    // Supprimer de la base
    const { error } = await supabase
      .from("home_gallery")
      .delete()
      .eq("id", photoId);

    if (error) throw error;

    revalidatePath("/");
    revalidatePath("/admin/photos");

    return { success: true };
  } catch (error) {
    console.error("Error deleting gallery photo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la suppression",
    };
  }
}

/**
 * Réordonne les photos de la galerie
 */
export async function reorderGalleryPhotos(photoIds: string[]) {
  const supabase = createClient();

  try {
    // Mettre à jour l'ordre de chaque photo
    const updates = photoIds.map((id, index) =>
      supabase
        .from("home_gallery")
        .update({ display_order: index })
        .eq("id", id)
    );

    await Promise.all(updates);

    revalidatePath("/");
    revalidatePath("/admin/photos");

    return { success: true };
  } catch (error) {
    console.error("Error reordering photos:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors du réordonnancement",
    };
  }
}

/**
 * Met à jour la photo d'un joueur
 */
export async function updatePlayerPhoto(userId: string, formData: FormData) {
  const supabase = createClient();
  const file = formData.get("player_photo") as File;

  if (!file || file.size === 0) {
    return { success: false, error: "Aucun fichier fourni" };
  }

  try {
    // Récupérer l'ancienne photo pour la supprimer
    const { data: user } = await supabase
      .from("users")
      .select("photo_path")
      .eq("id", userId)
      .single();

    // Supprimer l'ancienne photo si elle existe
    if (user?.photo_path) {
      await deleteImage(user.photo_path, "player-photos");
    }

    // Upload la nouvelle photo
    const { url, path } = await uploadImage(file, "player-photos", userId);

    // Mettre à jour l'utilisateur
    const { error } = await supabase
      .from("users")
      .update({
        photo_url: url,
        photo_path: path,
      })
      .eq("id", userId);

    if (error) throw error;

    revalidatePath("/");
    revalidatePath("/register");
    revalidatePath(`/players/${userId}`);

    return { success: true, url };
  } catch (error) {
    console.error("Error updating player photo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de l'upload",
    };
  }
}
```

### 4. Composant Drag & Drop Réutilisable

#### Installation de react-dropzone
```bash
npm install react-dropzone
```

#### src/components/ui/ImageDropzone.tsx
```tsx
"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

type ImageDropzoneProps = {
  onImageSelected: (file: File) => void;
  currentImageUrl?: string | null;
  accept?: Record<string, string[]>;
  maxSize?: number; // en bytes
  label?: string;
  description?: string;
  aspectRatio?: string; // ex: "16/9", "1/1"
  className?: string;
};

export function ImageDropzone({
  onImageSelected,
  currentImageUrl,
  accept = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
  },
  maxSize = 5 * 1024 * 1024, // 5MB par défaut
  label = "Photo",
  description = "Glissez-déposez ou cliquez pour sélectionner",
  aspectRatio = "16/9",
  className,
}: ImageDropzoneProps) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null);

      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === "file-too-large") {
          setError(`Fichier trop volumineux. Maximum ${maxSize / 1024 / 1024}MB`);
        } else if (rejection.errors[0]?.code === "file-invalid-type") {
          setError("Format non supporté. Utilisez JPG, PNG ou WebP");
        } else {
          setError("Erreur lors du chargement du fichier");
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        onImageSelected(file);

        // Créer un preview
        const reader = new FileReader();
        reader.onload = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    },
    [onImageSelected, maxSize]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
  });

  const clearPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setError(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="block text-sm font-medium text-white/80">
          {label}
        </label>
      )}

      <div
        {...getRootProps()}
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden",
          "hover:border-orange-500/50 hover:bg-white/5",
          isDragActive
            ? "border-orange-500 bg-orange-500/10"
            : "border-white/20 bg-white/5",
          error && "border-red-500/50"
        )}
        style={{ aspectRatio }}
      >
        <input {...getInputProps()} />

        {preview ? (
          <>
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover"
            />
            <button
              onClick={clearPreview}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
              type="button"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-3">
              {isDragActive ? (
                <Upload className="w-6 h-6 text-white animate-bounce" />
              ) : (
                <ImageIcon className="w-6 h-6 text-white" />
              )}
            </div>
            <p className="text-sm font-medium text-white/80 mb-1">
              {isDragActive ? "Déposez l'image ici" : description}
            </p>
            <p className="text-xs text-white/50">
              JPG, PNG ou WebP • Max {maxSize / 1024 / 1024}MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <X className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}
```

### 5. Page d'Administration Photos

#### src/app/admin/photos/page.tsx
```tsx
import { createClient } from "@/lib/supabase/server";
import { HomePhotosManager } from "@/components/admin/HomePhotosManager";
import { redirect } from "next/navigation";

export default async function AdminPhotosPage() {
  const supabase = createClient();

  // Vérifier l'authentification admin
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Récupérer la config actuelle
  const { data: config } = await supabase
    .from("home_config")
    .select("*")
    .eq("id", "00000000-0000-0000-0000-000000000001")
    .single();

  // Récupérer les photos de la galerie
  const { data: galleryPhotos } = await supabase
    .from("home_gallery")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  return (
    <div className="min-h-screen bg-[#1E1E2E]">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Gestion des Photos
          </h1>
          <p className="text-white/60">
            Gérez la photo de couverture et la galerie de la page d'accueil
          </p>
        </div>

        <HomePhotosManager
          initialConfig={config}
          initialGalleryPhotos={galleryPhotos || []}
        />
      </div>
    </div>
  );
}
```

#### src/components/admin/HomePhotosManager.tsx
```tsx
"use client";

import { useState, useTransition } from "react";
import { ImageDropzone } from "@/components/ui/ImageDropzone";
import {
  updateHomeCoverPhoto,
  addGalleryPhoto,
  deleteGalleryPhoto,
  reorderGalleryPhotos,
} from "@/app/actions/photo-actions";
import { Image as ImageIcon, Trash2, GripVertical, Plus } from "lucide-react";
import Image from "next/image";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

type HomeConfig = {
  id: string;
  cover_photo_url: string | null;
  cover_photo_path: string | null;
};

type GalleryPhoto = {
  id: string;
  photo_url: string;
  photo_path: string;
  caption: string | null;
  display_order: number;
};

type Props = {
  initialConfig: HomeConfig | null;
  initialGalleryPhotos: GalleryPhoto[];
};

export function HomePhotosManager({ initialConfig, initialGalleryPhotos }: Props) {
  const [isPending, startTransition] = useTransition();
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null);
  const [galleryPhoto, setGalleryPhoto] = useState<File | null>(null);
  const [galleryCaption, setGalleryCaption] = useState("");
  const [photos, setPhotos] = useState(initialGalleryPhotos);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const handleCoverPhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coverPhoto) return;

    const formData = new FormData();
    formData.append("cover_photo", coverPhoto);

    startTransition(async () => {
      const result = await updateHomeCoverPhoto(formData);
      if (result.success) {
        setMessage({ type: "success", text: "Photo de couverture mise à jour !" });
        setCoverPhoto(null);
      } else {
        setMessage({ type: "error", text: result.error || "Erreur" });
      }
    });
  };

  const handleGalleryPhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryPhoto) return;

    const formData = new FormData();
    formData.append("gallery_photo", galleryPhoto);
    formData.append("caption", galleryCaption);

    startTransition(async () => {
      const result = await addGalleryPhoto(formData);
      if (result.success) {
        setMessage({ type: "success", text: "Photo ajoutée à la galerie !" });
        setGalleryPhoto(null);
        setGalleryCaption("");
      } else {
        setMessage({ type: "error", text: result.error || "Erreur" });
      }
    });
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette photo ?")) return;

    startTransition(async () => {
      const result = await deleteGalleryPhoto(photoId);
      if (result.success) {
        setPhotos(photos.filter((p) => p.id !== photoId));
        setMessage({ type: "success", text: "Photo supprimée !" });
      } else {
        setMessage({ type: "error", text: result.error || "Erreur" });
      }
    });
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(photos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setPhotos(items);

    // Sauvegarder le nouvel ordre
    startTransition(async () => {
      const photoIds = items.map((p) => p.id);
      await reorderGalleryPhotos(photoIds);
    });
  };

  return (
    <div className="space-y-8">
      {/* Message de feedback */}
      {message && (
        <div
          className={`rounded-xl p-4 ${
            message.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Photo de Couverture */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-orange-500" />
          Photo de Couverture
        </h2>
        <p className="text-sm text-white/60 mb-6">
          Photo panoramique affichée en haut de la page d'accueil (recommandé : 1920x400px)
        </p>

        <form onSubmit={handleCoverPhotoSubmit} className="space-y-4">
          <ImageDropzone
            onImageSelected={setCoverPhoto}
            currentImageUrl={initialConfig?.cover_photo_url}
            label="Image de couverture"
            description="Glissez-déposez ou cliquez pour sélectionner"
            aspectRatio="16/4"
          />

          <button
            type="submit"
            disabled={!coverPhoto || isPending}
            className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 font-medium text-white transition-all hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Upload en cours..." : "Mettre à jour la couverture"}
          </button>
        </form>
      </section>

      {/* Galerie Photos */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-orange-500" />
          Galerie de Photos
        </h2>
        <p className="text-sm text-white/60 mb-6">
          Photos affichées dans la galerie de la page d'accueil
        </p>

        {/* Formulaire d'ajout */}
        <form onSubmit={handleGalleryPhotoSubmit} className="space-y-4 mb-8">
          <ImageDropzone
            onImageSelected={setGalleryPhoto}
            label="Ajouter une photo"
            description="Glissez-déposez ou cliquez pour sélectionner"
            aspectRatio="4/3"
          />

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Légende (optionnelle)
            </label>
            <input
              type="text"
              value={galleryCaption}
              onChange={(e) => setGalleryCaption(e.target.value)}
              placeholder="Ex: Tournoi d'été 2025"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <button
            type="submit"
            disabled={!galleryPhoto || isPending}
            className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 font-medium text-white transition-all hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {isPending ? "Ajout en cours..." : "Ajouter à la galerie"}
          </button>
        </form>

        {/* Liste des photos avec drag & drop */}
        {photos.length > 0 ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="gallery">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-3"
                >
                  {photos.map((photo, index) => (
                    <Draggable key={photo.id} draggableId={photo.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
                        >
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical className="w-5 h-5 text-white/40" />
                          </div>

                          <div className="relative w-24 h-16 rounded-lg overflow-hidden">
                            <Image
                              src={photo.photo_url}
                              alt={photo.caption || "Photo"}
                              fill
                              className="object-cover"
                            />
                          </div>

                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">
                              {photo.caption || "Sans légende"}
                            </p>
                            <p className="text-xs text-white/40">
                              Position: {index + 1}
                            </p>
                          </div>

                          <button
                            onClick={() => handleDeletePhoto(photo.id)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                            type="button"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <div className="text-center py-12 text-white/40">
            Aucune photo dans la galerie. Ajoutez-en une !
          </div>
        )}
      </section>
    </div>
  );
}
```

### 6. Installation de la librairie drag & drop
```bash
npm install @hello-pangea/dnd
```

### 7. Galerie sur la Home Page

#### src/components/home/HomeGallery.tsx
```tsx
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import { ImageIcon } from "lucide-react";

export async function HomeGallery() {
  const supabase = createClient();

  const { data: photos } = await supabase
    .from("home_gallery")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(12); // Limiter à 12 photos

  if (!photos || photos.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <ImageIcon className="w-5 h-5 text-orange-500" />
        Galerie
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10 hover:border-orange-500/50 transition-all"
          >
            <Image
              src={photo.photo_url}
              alt={photo.caption || "Photo"}
              fill
              className="object-cover transition-transform group-hover:scale-110"
            />

            {photo.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <p className="text-xs text-white font-medium">
                  {photo.caption}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
```

### 8. Intégration dans la Home Page

#### Mise à jour de src/app/page.tsx
```tsx
// Ajouter l'import
import { HomeGallery } from "@/components/home/HomeGallery";

// Dans le return, ajouter après les KPIs principaux :
<main className="space-y-8">
  <ChampionsPodium pairs={top3Pairs} />
  <PairRankings pairs={top10Pairs} />
  <PlayerRankings players={top10Players} />

  {/* Ajouter la galerie ici */}
  <HomeGallery />

  <TightestMatch match={tightestMatch} />
  {/* ... reste des composants */}
</main>
```

### 9. Upload Photo lors de l'Inscription

#### Mise à jour du formulaire d'inscription
```tsx
// src/app/register/page.tsx ou composant RegisterForm

"use client";

import { useState } from "react";
import { ImageDropzone } from "@/components/ui/ImageDropzone";
import { updatePlayerPhoto } from "@/app/actions/photo-actions";

export function RegisterForm() {
  const [playerPhoto, setPlayerPhoto] = useState<File | null>(null);

  // ... autres states

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Créer l'utilisateur d'abord
    const user = await createUser(formData);

    // 2. Si une photo a été sélectionnée, l'uploader
    if (playerPhoto && user.id) {
      const photoFormData = new FormData();
      photoFormData.append("player_photo", playerPhoto);
      await updatePlayerPhoto(user.id, photoFormData);
    }

    // 3. Rediriger ou afficher succès
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ... autres champs du formulaire */}

      <div>
        <ImageDropzone
          onImageSelected={setPlayerPhoto}
          label="Photo de profil (optionnelle)"
          description="Cette photo sera affichée sur votre profil"
          aspectRatio="1/1"
          maxSize={3 * 1024 * 1024} // 3MB
        />
        <p className="mt-2 text-xs text-white/50">
          Votre photo apparaîtra dans les classements et sur la page d'accueil
        </p>
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 font-medium text-white hover:from-orange-600 hover:to-orange-700 transition-all"
      >
        S'inscrire
      </button>
    </form>
  );
}
```

## Navigation Admin

#### Ajouter le lien dans la navigation admin
```tsx
// src/components/admin/AdminNav.tsx (ou équivalent)

<nav className="flex gap-4">
  <Link
    href="/admin/photos"
    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
  >
    📸 Photos
  </Link>
  {/* ... autres liens admin */}
</nav>
```

## Tests et Validation

### Checklist de tests
- [ ] Upload d'une photo de couverture fonctionne
- [ ] La photo de couverture s'affiche correctement sur la home page
- [ ] Ajout de photos à la galerie fonctionne
- [ ] Suppression de photos de la galerie fonctionne
- [ ] Drag & drop pour réordonner la galerie fonctionne
- [ ] La galerie s'affiche correctement sur la home page
- [ ] Upload de photo lors de l'inscription fonctionne
- [ ] La photo du joueur s'affiche dans les classements
- [ ] Les images sont bien stockées dans Supabase Storage
- [ ] Les anciennesimages sont bien supprimées lors du remplacement
- [ ] Validation des formats et tailles de fichiers fonctionne
- [ ] Messages d'erreur appropriés en cas de problème
- [ ] Design conforme à la charte Proposition 3
- [ ] Responsive sur mobile/tablet/desktop

## Notes Importantes

1. **Permissions Supabase** : S'assurer que les policies sont correctement configurées
2. **Taille des images** : Limiter à 5MB pour éviter les uploads trop longs
3. **Formats acceptés** : JPG, PNG, WebP uniquement
4. **Optimisation** : Envisager de redimensionner les images côté serveur (sharp, etc.)
5. **Cache** : Les URLs Supabase Storage incluent un cache-control, penser à revalider les pages
6. **Fallbacks** : Toujours avoir des placeholders SVG si pas de photo
7. **Sécurité** : Valider les fichiers côté serveur également, pas uniquement côté client

## Améliorations Futures (Optionnelles)

- Compression automatique des images avant upload
- Recadrage d'image dans l'interface (react-image-crop)
- Filtres et effets sur les images
- Lightbox pour voir les photos en grand
- Pagination de la galerie si >12 photos
- Statistiques sur l'utilisation du storage
- Gestion des albums (plusieurs galeries thématiques)
