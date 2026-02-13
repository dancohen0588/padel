# Prompt Roo : Remplacement de Supabase Storage par File System Local

## Contexte
Le système de gestion des photos utilise actuellement Supabase Storage, mais le projet utilise Neon pour la base de données (pas Supabase). Il faut remplacer le système de stockage d'images par une solution locale basée sur le file system.

## Problème Actuel
- Le fichier `src/lib/storage-helpers.ts` utilise `createClient()` de `@/lib/supabase/server`
- Les variables d'environnement Supabase ne sont pas configurées
- Erreur : "Missing Supabase environment variables"

## Solution : File System Local

### 1. Supprimer les Dépendances Supabase

#### Supprimer le dossier Supabase
```bash
rm -rf src/lib/supabase
```

### 2. Créer un Nouveau Storage Helper (File System)

#### Remplacer complètement src/lib/storage-helpers.ts
```typescript
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export type StorageBucket = "home-photos" | "player-photos";

/**
 * Retourne le chemin du dossier pour un bucket donné
 */
function getBucketPath(bucket: StorageBucket): string {
  const baseDir = path.join(process.cwd(), "public", "uploads");
  const bucketDir = path.join(baseDir, bucket);
  return bucketDir;
}

/**
 * S'assure que le dossier existe
 */
async function ensureDirExists(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

/**
 * Upload une image vers le file system local
 * @param file - Le fichier à uploader
 * @param bucket - Le bucket ('home-photos' ou 'player-photos')
 * @param folder - Sous-dossier optionnel
 * @returns L'URL publique et le chemin de l'image
 */
export async function uploadImage(
  file: File,
  bucket: StorageBucket,
  folder?: string
): Promise<{ url: string; path: string }> {
  try {
    // Générer un nom unique
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileExt = file.name.split(".").pop();
    const fileName = `${timestamp}-${randomStr}.${fileExt}`;

    // Construire le chemin
    const bucketPath = getBucketPath(bucket);
    const folderPath = folder ? path.join(bucketPath, folder) : bucketPath;
    await ensureDirExists(folderPath);

    const filePath = path.join(folderPath, fileName);
    const relativePath = folder ? `${folder}/${fileName}` : fileName;

    // Convertir le File en Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Écrire le fichier
    await writeFile(filePath, buffer);

    // Construire l'URL publique (accessible via /uploads/...)
    const publicUrl = `/uploads/${bucket}/${relativePath}`;

    return {
      url: publicUrl,
      path: relativePath, // Chemin relatif pour stockage en DB
    };
  } catch (error) {
    console.error("Error uploading image:", error);
    throw new Error(
      `Failed to upload image: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Supprime une image du file system
 * @param relativePath - Le chemin relatif de l'image (ex: "cover/123-abc.jpg")
 * @param bucket - Le bucket
 */
export async function deleteImage(
  relativePath: string,
  bucket: StorageBucket
): Promise<void> {
  try {
    const bucketPath = getBucketPath(bucket);
    const fullPath = path.join(bucketPath, relativePath);

    // Vérifier que le fichier existe avant de le supprimer
    if (existsSync(fullPath)) {
      await unlink(fullPath);
      console.log(`Successfully deleted image: ${relativePath}`);
    } else {
      console.warn(`File not found, skipping deletion: ${relativePath}`);
    }
  } catch (error) {
    console.error("Error deleting image:", error);
    // Ne pas throw l'erreur pour éviter de bloquer si le fichier n'existe pas
    console.warn(`Failed to delete image: ${relativePath}`);
  }
}

/**
 * Valide qu'un fichier est une image valide
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Format non supporté. Utilisez JPG, PNG ou WebP.",
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: "L'image est trop volumineuse. Maximum 5MB.",
    };
  }

  return { valid: true };
}
```

### 3. Créer la Structure de Dossiers

#### Créer les dossiers d'upload
```bash
mkdir -p public/uploads/home-photos/cover
mkdir -p public/uploads/home-photos/gallery
mkdir -p public/uploads/player-photos
```

#### Ajouter un fichier .gitkeep pour garder les dossiers dans Git
```bash
touch public/uploads/home-photos/.gitkeep
touch public/uploads/player-photos/.gitkeep
```

#### Ajouter au .gitignore pour ne pas commiter les images
```bash
# .gitignore
# Ajouter ces lignes :
public/uploads/**/*
!public/uploads/**/.gitkeep
```

### 4. Configuration Next.js

#### Vérifier next.config.ts
S'assurer que les images locales sont autorisées :

```typescript
// next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Permettre les images locales
    unoptimized: false,
  },
};

export default nextConfig;
```

### 5. Mettre à Jour les Imports (Si Nécessaire)

Vérifier que tous les fichiers qui importent `storage-helpers` n'importent pas de dépendances Supabase :

```bash
# Rechercher toutes les références à Supabase
grep -r "supabase" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules
```

Si des fichiers importent encore `@/lib/supabase/server`, les nettoyer.

### 6. Vérifier les Actions Photo

Les fichiers suivants utilisent déjà correctement `storage-helpers` et n'ont PAS besoin d'être modifiés :
- ✅ `src/app/actions/photo-actions.ts` (déjà correct)
- ✅ `src/app/actions/photos.ts` (n'utilise pas storage)

### 7. Créer un Composant pour Afficher les Images

#### src/components/ui/StorageImage.tsx (optionnel mais recommandé)
```tsx
import Image, { ImageProps } from "next/image";

type StorageImageProps = Omit<ImageProps, "src"> & {
  src: string | null | undefined;
  fallback?: string;
};

/**
 * Composant Image qui gère automatiquement les URLs de storage locales
 */
export function StorageImage({ src, fallback, alt, ...props }: StorageImageProps) {
  // Si pas de src, utiliser le fallback ou une image par défaut
  const imageSrc = src || fallback || "/placeholder-image.png";

  return <Image src={imageSrc} alt={alt} {...props} />;
}
```

Usage :
```tsx
<StorageImage
  src={player.photo_url}
  alt={player.name}
  width={48}
  height={48}
  className="rounded-full"
/>
```

### 8. Tester le Système

#### Test 1 : Upload de Photo de Couverture
1. Aller sur `/admin/inscriptions?token=frerots-2026`
2. Section "Photo de couverture"
3. Uploader une image
4. Vérifier qu'elle apparaît dans `public/uploads/home-photos/cover/`
5. Vérifier qu'elle s'affiche correctement sur la page

#### Test 2 : Galerie
1. Ajouter une photo à la galerie
2. Vérifier qu'elle apparaît dans `public/uploads/home-photos/gallery/`
3. Vérifier qu'elle s'affiche dans la galerie

#### Test 3 : Photo Joueur
1. Aller sur le formulaire d'inscription
2. Uploader une photo de profil
3. Vérifier qu'elle apparaît dans `public/uploads/player-photos/`

#### Test 4 : Suppression
1. Supprimer une photo de la galerie
2. Vérifier qu'elle est supprimée du file system
3. Vérifier qu'elle n'apparaît plus dans la DB

### 9. Alternative pour Production : Vercel Blob Storage

Si le projet est déployé sur Vercel, le file system est **read-only** en production. Il faudra utiliser **Vercel Blob Storage** à la place.

#### Installation
```bash
npm install @vercel/blob
```

#### Variables d'Environnement (.env.local)
```bash
BLOB_READ_WRITE_TOKEN=votre_token_vercel_blob
```

#### Modifier storage-helpers.ts pour Vercel Blob
```typescript
import { put, del } from "@vercel/blob";

export async function uploadImage(
  file: File,
  bucket: StorageBucket,
  folder?: string
): Promise<{ url: string; path: string }> {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const fileExt = file.name.split(".").pop();
  const fileName = `${timestamp}-${randomStr}.${fileExt}`;
  const relativePath = folder ? `${folder}/${fileName}` : fileName;
  const fullPath = `${bucket}/${relativePath}`;

  const blob = await put(fullPath, file, {
    access: "public",
  });

  return {
    url: blob.url,
    path: relativePath,
  };
}

export async function deleteImage(
  relativePath: string,
  bucket: StorageBucket
): Promise<void> {
  const fullPath = `${bucket}/${relativePath}`;
  await del(fullPath);
}
```

**Note** : Pour le développement local, utilisez le file system. Pour la production sur Vercel, utilisez Vercel Blob Storage.

## Structure Finale

```
public/
  uploads/
    home-photos/
      .gitkeep
      cover/
        1234567890-abc123.jpg
        1234567891-def456.jpg
      gallery/
        1234567892-ghi789.jpg
    player-photos/
      .gitkeep
      user-id-1/
        1234567893-jkl012.jpg

src/
  lib/
    storage-helpers.ts (VERSION FILE SYSTEM)
  app/
    actions/
      photo-actions.ts (pas de changement)
      photos.ts (pas de changement)
```

## Avantages de la Solution File System

✅ **Simple** : Pas de service externe, pas de configuration complexe
✅ **Gratuit** : Aucun coût
✅ **Rapide** : Accès direct au file system
✅ **Pas de quota** : Limité uniquement par l'espace disque
✅ **Développement facile** : Fonctionne immédiatement en local

## Inconvénients et Limites

⚠️ **Vercel Production** : Ne fonctionne pas tel quel sur Vercel (nécessite Vercel Blob)
⚠️ **Backups** : Les images ne sont pas dans Git (mais c'est normal)
⚠️ **CDN** : Pas de CDN automatique (mais Next.js optimise quand même les images)
⚠️ **Scalabilité** : Pour un gros volume, préférer un service dédié

## Recommandation

Pour ce projet "Le tournoi des frérots" :
- **Développement local** : Utiliser le file system (solution proposée ici)
- **Production hobby** : Vercel Blob Storage (gratuit jusqu'à 1GB)
- **Production pro** : Cloudinary ou AWS S3 (si besoin de CDN, transformations, etc.)

## Migration des Photos Existantes (Si Applicable)

Si des photos existent déjà en base avec des URLs Supabase :

```sql
-- Marquer les anciennes photos comme invalides
UPDATE home_config
SET cover_photo_url = NULL,
    cover_photo_path = NULL;

UPDATE home_gallery
SET is_active = false
WHERE photo_url LIKE '%supabase%';

UPDATE players
SET photo_url = NULL,
    photo_path = NULL
WHERE photo_url LIKE '%supabase%';
```

Ensuite, ré-uploader les photos via l'interface admin.

## Checklist de Validation

- [ ] Supprimer `src/lib/supabase/`
- [ ] Remplacer complètement `src/lib/storage-helpers.ts`
- [ ] Créer les dossiers `public/uploads/`
- [ ] Ajouter `.gitkeep` et mettre à jour `.gitignore`
- [ ] Tester upload photo couverture
- [ ] Tester ajout photo galerie
- [ ] Tester suppression photo galerie
- [ ] Tester réordonnancement galerie
- [ ] Tester upload photo joueur
- [ ] Vérifier que les fichiers sont bien créés dans `public/uploads/`
- [ ] Vérifier que les images s'affichent correctement
- [ ] Vérifier que les suppressions fonctionnent
- [ ] Nettoyer les anciennes références Supabase si nécessaire
