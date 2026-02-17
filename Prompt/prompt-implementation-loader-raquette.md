# Prompt d'implémentation : Loader avec Raquette de Padel

## 🎯 Objectif

Ajouter un loader contextuel au padel sur tous les boutons (CTA) de l'application pour indiquer qu'un chargement est en cours. Le loader utilise une image de raquette de padel orange qui tourne sur elle-même.

## 📋 Contexte technique

### Stack
- **Framework** : Next.js 14+ (App Router)
- **TypeScript** : Strict mode activé
- **Styling** : Tailwind CSS avec thème sombre (#1E1E2E)
- **Server Actions** : useFormState pour les formulaires
- **React** : Composants client avec useState, useEffect

### Image source
- **Chemin local** : `/Users/dancohen/Documents/Travail/IA/padel/loader/raquette orange.png`
- **Destination** : `/public/images/loader-raquette.png`

---

## 📂 Fichiers à créer/modifier

### 1. Image (copie)
**Source** : `/Users/dancohen/Documents/Travail/IA/padel/loader/raquette orange.png`
**Destination** : `/public/images/loader-raquette.png`

### 2. Composant Loader (nouveau)
**Chemin** : `/src/components/ui/padel-loader.tsx`

### 3. Hook useFormPending (nouveau)
**Chemin** : `/src/hooks/use-form-pending.ts`

### 4. Composants à modifier
- `/src/components/ui/gradient-button.tsx`
- `/src/app/inscription/registration-form.tsx`
- `/src/components/admin/tabs/UsersValidatedTab.tsx`
- `/src/components/admin/tabs/UsersApprovalTab.tsx`

---

## 🛠️ Implémentation détaillée

### Étape 1 : Copier l'image

**Action** : Copier l'image de la raquette dans le dossier public

```bash
# Créer le dossier images s'il n'existe pas
mkdir -p public/images

# Copier l'image
cp "/Users/dancohen/Documents/Travail/IA/padel/loader/raquette orange.png" public/images/loader-raquette.png
```

---

### Étape 2 : Créer le composant PadelLoader

**Fichier** : `/src/components/ui/padel-loader.tsx`

```typescript
import Image from "next/image";

type PadelLoaderProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_MAP = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function PadelLoader({ size = "md", className = "" }: PadelLoaderProps) {
  return (
    <div
      className={`inline-flex items-center justify-center ${SIZE_MAP[size]} ${className}`}
      role="status"
      aria-label="Chargement en cours"
    >
      <Image
        src="/images/loader-raquette.png"
        alt="Chargement"
        width={size === "sm" ? 16 : size === "md" ? 24 : 32}
        height={size === "sm" ? 16 : size === "md" ? 24 : 32}
        className="animate-spin"
        priority
      />
      <span className="sr-only">Chargement en cours...</span>
    </div>
  );
}
```

**Explications** :
- `size` : Permet d'ajuster la taille du loader (sm/md/lg)
- `animate-spin` : Animation de rotation Tailwind (360° en 1s par défaut)
- `priority` : Charge l'image en priorité pour éviter les délais
- `sr-only` : Texte accessible pour les lecteurs d'écran

---

### Étape 3 : Créer le hook useFormPending

**Fichier** : `/src/hooks/use-form-pending.ts`

```typescript
"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * Hook pour détecter l'état pending d'un formulaire avec Server Action
 * Utilise useFormStatus de React pour tracker l'état de soumission
 */
export function useFormPending() {
  const { pending } = useFormStatus();
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setIsPending(pending);
  }, [pending]);

  return isPending;
}
```

**Explications** :
- `useFormStatus` : Hook React qui retourne l'état du formulaire parent
- Compatible avec les Server Actions Next.js
- Retourne `true` pendant la soumission du formulaire

---

### Étape 4 : Modifier le composant GradientButton

**Fichier** : `/src/components/ui/gradient-button.tsx`

**Modifications** :

```typescript
"use client";

import { PadelLoader } from "@/components/ui/padel-loader";
import { useFormPending } from "@/hooks/use-form-pending";

type GradientButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
  isLoading?: boolean; // 👈 NOUVEAU : permet de contrôler manuellement le loader
};

export function GradientButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  variant = "primary",
  className = "",
  isLoading = false,
}: GradientButtonProps) {
  // Détecter automatiquement l'état pending pour les formulaires
  const isPending = useFormPending();
  const showLoader = isLoading || isPending;

  const baseClasses =
    "inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClasses =
    variant === "primary"
      ? "bg-gradient-to-r from-orange-500 to-orange-400 shadow-glow hover:shadow-[0_8px_16px_rgba(255,107,53,0.3)]"
      : "border border-white/20 bg-white/10 hover:bg-white/15";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || showLoader}
      className={`${baseClasses} ${variantClasses} ${className}`}
    >
      {showLoader ? (
        <>
          <PadelLoader size="sm" />
          <span>Chargement...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
```

**Changements** :
- Import de `PadelLoader` et `useFormPending`
- Nouvelle prop `isLoading` pour contrôle manuel
- Détection automatique de l'état pending dans les formulaires
- Affichage du loader + texte "Chargement..." pendant l'état de chargement
- Désactivation du bouton pendant le chargement

---

### Étape 5 : Modifier les boutons du formulaire d'inscription

**Fichier** : `/src/app/inscription/registration-form.tsx`

**Modifications** :

```typescript
"use client";

import { useFormStatus } from "react-dom";
import { PadelLoader } from "@/components/ui/padel-loader";

// ... imports existants

export function RegistrationForm({ ... }: RegistrationFormProps) {
  // ... états existants

  // Composant interne pour les boutons de formulaire
  function SubmitButton({ children, disabled = false }: { children: React.ReactNode; disabled?: boolean }) {
    const { pending } = useFormStatus();

    return (
      <button
        type="submit"
        disabled={disabled || pending}
        className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(255,107,53,0.3)] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        {pending ? (
          <>
            <PadelLoader size="sm" />
            <span>Chargement...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }

  // Composant interne pour le bouton de vérification téléphone
  function VerifyButton({
    onClick,
    isVerifying,
    children,
  }: {
    onClick: () => void;
    isVerifying: boolean;
    children: React.ReactNode;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={isVerifying}
        className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(255,107,53,0.3)] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        {isVerifying ? (
          <>
            <PadelLoader size="sm" />
            <span>Vérification...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }

  // ... reste du composant

  return (
    <div>
      {/* ... formulaire */}

      <form action={formAction}>
        {/* ... champs */}

        {/* Bouton submit - Mode nouveau */}
        {mode === "new" ? (
          <div className="flex gap-3">
            <SubmitButton>
              S'inscrire au tournoi
            </SubmitButton>
          </div>
        ) : null}

        {/* Bouton vérification - Mode existant */}
        {mode === "existing" && !verifiedPlayer && phoneStatus !== "error" ? (
          <div className="flex gap-3">
            <VerifyButton onClick={handleVerifyPhone} isVerifying={isVerifying}>
              Vérifier mon compte
            </VerifyButton>
          </div>
        ) : null}

        {/* Bouton confirmation - Mode existant avec joueur vérifié */}
        {mode === "existing" && verifiedPlayer ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <SubmitButton>
              Confirmer l'inscription
            </SubmitButton>
            <button
              type="button"
              onClick={resetExistingFlow}
              className="flex-1 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/15"
            >
              Ce n'est pas moi
            </button>
          </div>
        ) : null}

        {/* Bouton réessayer - Mode existant avec erreur */}
        {mode === "existing" && phoneStatus === "error" && !verifiedPlayer ? (
          <div className="flex flex-col gap-2 text-sm">
            <VerifyButton onClick={handleVerifyPhone} isVerifying={isVerifying}>
              Réessayer
            </VerifyButton>
            <button
              type="button"
              onClick={() => handleModeChange("new")}
              className="text-xs font-semibold text-orange-400 underline"
            >
              M'inscrire comme nouveau participant
            </button>
          </div>
        ) : null}

        {/* MODE BINÔME : Boutons pour Joueur 1 */}
        {isPairMode ? (
          <>
            {player1Mode === "existing" && !player1VerifiedPlayer && player1PhoneStatus !== "error" ? (
              <div className="flex gap-3">
                <VerifyButton onClick={() => handleVerifyPlayerPhone("player1")} isVerifying={player1IsVerifying}>
                  Vérifier le compte du joueur 1
                </VerifyButton>
              </div>
            ) : null}

            {/* ... autres boutons pour joueur 1 */}
          </>
        ) : null}

        {/* MODE BINÔME : Boutons pour Joueur 2 */}
        {isPairMode ? (
          <>
            {player2Mode === "existing" && !player2VerifiedPlayer && player2PhoneStatus !== "error" ? (
              <div className="flex gap-3">
                <VerifyButton onClick={() => handleVerifyPlayerPhone("player2")} isVerifying={player2IsVerifying}>
                  Vérifier le compte du joueur 2
                </VerifyButton>
              </div>
            ) : null}

            {/* ... autres boutons pour joueur 2 */}
          </>
        ) : null}

        {/* MODE BINÔME : Bouton submit final */}
        {isPairMode ? (
          <div className="flex gap-3">
            <SubmitButton>
              Inscrire les deux joueurs
            </SubmitButton>
          </div>
        ) : null}
      </form>
    </div>
  );
}
```

**Changements** :
- Import de `useFormStatus` et `PadelLoader`
- Création de deux composants internes : `SubmitButton` et `VerifyButton`
- `SubmitButton` : Détecte automatiquement l'état pending du formulaire
- `VerifyButton` : Utilise un état `isVerifying` passé en prop
- Tous les boutons affichent le loader pendant le chargement
- Application du loader pour les boutons des deux joueurs en mode binôme

---

### Étape 6 : Modifier l'onglet admin "Joueurs"

**Fichier** : `/src/components/admin/tabs/UsersValidatedTab.tsx`

**Modifications** :

```typescript
"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { PadelLoader } from "@/components/ui/padel-loader";
// ... autres imports

export function UsersValidatedTab({ ... }: UsersValidatedTabProps) {
  // ... états existants

  // Composant interne pour les boutons avec loader
  function AdminButton({
    onClick,
    variant = "primary",
    children,
    isLoading = false,
    type = "button",
  }: {
    onClick?: () => void;
    variant?: "primary" | "danger" | "success";
    children: React.ReactNode;
    isLoading?: boolean;
    type?: "button" | "submit";
  }) {
    const { pending } = useFormStatus();
    const showLoader = isLoading || pending;

    const variantClasses = {
      primary: "bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-glow hover:shadow-[0_8px_16px_rgba(255,107,53,0.3)]",
      danger: "border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20",
      success: "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
    };

    return (
      <button
        type={type}
        onClick={onClick}
        disabled={showLoader}
        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]}`}
      >
        {showLoader ? (
          <>
            <PadelLoader size="sm" />
            <span>Chargement...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }

  // ... reste du composant

  return (
    <div>
      {/* Bouton "Créer un joueur" */}
      <AdminButton onClick={() => setShowCreateModal(true)} variant="primary">
        Créer un joueur
      </AdminButton>

      {/* Bouton de changement de statut */}
      <AdminButton
        onClick={() => handleStatusChange(registration.id, "approved")}
        variant="success"
        isLoading={isUpdating}
      >
        Approuver
      </AdminButton>

      {/* Bouton de suppression */}
      <AdminButton
        onClick={() => handleDelete(registration.id)}
        variant="danger"
        isLoading={isDeleting}
      >
        Supprimer
      </AdminButton>

      {/* ... reste de l'interface */}
    </div>
  );
}
```

**Changements** :
- Import de `useFormStatus` et `PadelLoader`
- Création d'un composant interne `AdminButton`
- Support de 3 variants : primary, danger, success
- Détection automatique de l'état pending pour les formulaires
- Prop `isLoading` pour les actions asynchrones hors formulaire

---

### Étape 7 : Modifier l'onglet admin "À valider"

**Fichier** : `/src/components/admin/tabs/UsersApprovalTab.tsx`

**Modifications** : Identiques à l'étape 6, en utilisant le même composant `AdminButton`

```typescript
"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { PadelLoader } from "@/components/ui/padel-loader";
// ... autres imports

export function UsersApprovalTab({ ... }: UsersApprovalTabProps) {
  // ... états existants

  // Composant interne AdminButton (identique à UsersValidatedTab)
  function AdminButton({ ... }: { ... }) {
    // ... code identique
  }

  return (
    <div>
      {/* Bouton "Valider" */}
      <AdminButton
        onClick={() => handleApprove(registration.id)}
        variant="success"
        isLoading={isApproving}
      >
        Valider
      </AdminButton>

      {/* Bouton "Rejeter" */}
      <AdminButton
        onClick={() => handleReject(registration.id)}
        variant="danger"
        isLoading={isRejecting}
      >
        Rejeter
      </AdminButton>

      {/* ... reste de l'interface */}
    </div>
  );
}
```

---

### Étape 8 : Ajouter l'animation personnalisée (optionnel)

**Fichier** : `/tailwind.config.ts`

**Modification** : Personnaliser la durée de rotation si nécessaire

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  // ... config existante
  theme: {
    extend: {
      // ... autres extensions
      animation: {
        spin: "spin 1s linear infinite", // Animation par défaut (1 seconde)
        "spin-slow": "spin 2s linear infinite", // Animation plus lente (2 secondes)
        "spin-fast": "spin 0.5s linear infinite", // Animation plus rapide (0.5 seconde)
      },
    },
  },
};

export default config;
```

**Utilisation** :
```tsx
// Animation normale (1s)
<PadelLoader size="md" className="animate-spin" />

// Animation lente (2s)
<PadelLoader size="md" className="animate-spin-slow" />

// Animation rapide (0.5s)
<PadelLoader size="md" className="animate-spin-fast" />
```

---

### Étape 9 : Optimiser l'image (optionnel)

**Action** : Optimiser l'image pour réduire la taille et améliorer les performances

```bash
# Installer sharp pour l'optimisation d'images (si pas déjà installé)
npm install sharp

# Créer un script d'optimisation
node -e "
const sharp = require('sharp');
sharp('public/images/loader-raquette.png')
  .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ quality: 80, compressionLevel: 9 })
  .toFile('public/images/loader-raquette-optimized.png')
  .then(() => console.log('Image optimized!'))
  .catch(err => console.error(err));
"

# Remplacer l'image originale par la version optimisée
mv public/images/loader-raquette-optimized.png public/images/loader-raquette.png
```

**Bénéfices** :
- Réduction de la taille du fichier
- Amélioration des performances de chargement
- Taille fixe (64x64px) pour cohérence

---

## ✅ Checklist d'implémentation

### Étape 1 : Image
- [ ] Copier l'image depuis `/Users/dancohen/Documents/Travail/IA/padel/loader/raquette orange.png`
- [ ] Placer dans `/public/images/loader-raquette.png`
- [ ] Vérifier que l'image est accessible via `/images/loader-raquette.png`

### Étape 2 : Composant PadelLoader
- [ ] Créer le fichier `/src/components/ui/padel-loader.tsx`
- [ ] Implémenter le composant avec les props `size` et `className`
- [ ] Ajouter l'animation `animate-spin`
- [ ] Tester l'affichage avec `size="sm"`, `size="md"`, `size="lg"`

### Étape 3 : Hook useFormPending
- [ ] Créer le fichier `/src/hooks/use-form-pending.ts`
- [ ] Implémenter le hook avec `useFormStatus`
- [ ] Tester dans un formulaire avec Server Action

### Étape 4 : GradientButton
- [ ] Modifier `/src/components/ui/gradient-button.tsx`
- [ ] Ajouter la prop `isLoading`
- [ ] Intégrer `useFormPending` et `PadelLoader`
- [ ] Tester avec et sans `isLoading`

### Étape 5 : Formulaire d'inscription
- [ ] Modifier `/src/app/inscription/registration-form.tsx`
- [ ] Créer les composants internes `SubmitButton` et `VerifyButton`
- [ ] Remplacer tous les boutons par les nouveaux composants
- [ ] Tester en mode solo et en mode binôme
- [ ] Vérifier le loader sur tous les boutons (submit, vérification, réessayer)

### Étape 6 : Admin Joueurs
- [ ] Modifier `/src/components/admin/tabs/UsersValidatedTab.tsx`
- [ ] Créer le composant interne `AdminButton`
- [ ] Remplacer tous les boutons par `AdminButton`
- [ ] Tester les actions (approuver, rejeter, supprimer, créer)

### Étape 7 : Admin À valider
- [ ] Modifier `/src/components/admin/tabs/UsersApprovalTab.tsx`
- [ ] Créer le composant interne `AdminButton` (identique)
- [ ] Remplacer tous les boutons
- [ ] Tester les actions (valider, rejeter)

### Étape 8 : Tests end-to-end
- [ ] **Test 1** : Inscription solo
  - Vérifier que le loader apparaît lors de la soumission
  - Vérifier que le bouton est désactivé pendant le chargement
  - Vérifier que le loader disparaît après la réponse

- [ ] **Test 2** : Inscription en binôme
  - Vérifier le loader sur les boutons des deux joueurs
  - Vérifier le loader sur le bouton submit final

- [ ] **Test 3** : Vérification téléphone
  - Vérifier que le loader apparaît pendant la vérification
  - Vérifier que le bouton "Vérifier" affiche "Vérification..."

- [ ] **Test 4** : Admin - Validation joueurs
  - Vérifier le loader sur "Valider" et "Rejeter"
  - Vérifier que le loader disparaît après l'action

- [ ] **Test 5** : Admin - Création joueur
  - Vérifier le loader sur "Créer un joueur"
  - Vérifier le loader dans le modal de création

### Étape 9 : Validation finale
- [ ] Vérifier que tous les CTA de l'application ont le loader
- [ ] Vérifier la cohérence visuelle (taille, couleur, animation)
- [ ] Vérifier l'accessibilité (aria-label, sr-only)
- [ ] Tester sur mobile et desktop
- [ ] Vérifier les performances (pas de lag pendant l'animation)

---

## 🎨 Design et UX

### Animation
- **Rotation** : 360° en 1 seconde (animation `spin`)
- **Direction** : Sens horaire
- **Fluidité** : `linear` pour une rotation constante

### Tailles
- **sm** : 16x16px (boutons petits, badges)
- **md** : 24x24px (boutons normaux) - **par défaut**
- **lg** : 32x32px (boutons larges, headers)

### États
- **Bouton désactivé** : `opacity-50`, `cursor-not-allowed`
- **Texte pendant chargement** : "Chargement..." ou "Vérification..."
- **Espacement** : `gap-2` entre le loader et le texte

### Accessibilité
- `role="status"` sur le conteneur du loader
- `aria-label="Chargement en cours"` sur le conteneur
- `<span className="sr-only">` pour le texte accessible aux lecteurs d'écran

---

## 📝 Notes supplémentaires

1. **Performance** : L'image est chargée avec `priority` dans Next.js Image pour éviter les délais

2. **Réutilisabilité** : Le composant `PadelLoader` peut être utilisé partout dans l'app :
   ```tsx
   import { PadelLoader } from "@/components/ui/padel-loader";

   // Dans un composant
   {isLoading && <PadelLoader size="md" />}
   ```

3. **Hook useFormStatus** : Fonctionne uniquement dans un composant enfant d'un `<form>` avec Server Action

4. **Alternative pour les actions hors formulaire** : Utiliser un état local :
   ```tsx
   const [isLoading, setIsLoading] = useState(false);

   const handleClick = async () => {
     setIsLoading(true);
     try {
       await someAsyncAction();
     } finally {
       setIsLoading(false);
     }
   };

   <button disabled={isLoading}>
     {isLoading ? <PadelLoader size="sm" /> : "Action"}
   </button>
   ```

5. **Pattern composant bouton interne** : Les composants `SubmitButton` et `AdminButton` sont créés comme composants internes pour avoir accès à `useFormStatus` dans le contexte du formulaire parent

6. **Optimisation image** : Si l'image est trop lourde, utiliser sharp pour la redimensionner et la compresser

---

## 🚀 Commandes utiles

```bash
# Copier l'image
cp "/Users/dancohen/Documents/Travail/IA/padel/loader/raquette orange.png" public/images/loader-raquette.png

# Vérifier que l'image existe
ls -lh public/images/loader-raquette.png

# Optimiser l'image (optionnel)
npm install sharp
node -e "const sharp = require('sharp'); sharp('public/images/loader-raquette.png').resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ quality: 80, compressionLevel: 9 }).toFile('public/images/loader-raquette-optimized.png');"

# Redémarrer le serveur Next.js
npm run dev
```

---

## 📚 Ressources

- Documentation Next.js Image : https://nextjs.org/docs/app/api-reference/components/image
- Documentation useFormStatus : https://react.dev/reference/react-dom/hooks/useFormStatus
- Documentation Tailwind CSS animations : https://tailwindcss.com/docs/animation
- Documentation sharp (optimisation d'images) : https://sharp.pixelplumbing.com/

---

**Fin du prompt d'implémentation**
