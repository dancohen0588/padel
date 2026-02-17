# Feature: Création de joueur depuis l'admin du tournoi

## Contexte
Ajouter la possibilité pour l'admin de créer un joueur directement depuis l'onglet "Joueurs" dans la zone admin d'un tournoi (`/tournaments/[slug]/admin`). Le joueur créé sera automatiquement validé (status="approved").

## Stack technique
- **Framework**: Next.js 14+ (App Router)
- **Langage**: TypeScript strict
- **Base de données**: PostgreSQL avec SQL direct (pas de Prisma)
- **Styling**: Tailwind CSS
- **Architecture**: Server Actions pour les mutations

## Fichiers concernés

### Fichiers à modifier
1. `/src/components/admin/tabs/UsersValidatedTab.tsx` - Ajouter le bouton "Créer un joueur" et la modale
2. `/src/app/actions/registrations.ts` - Ajouter une nouvelle Server Action `createPlayerByAdminAction`
3. `/src/lib/queries.ts` - Potentiellement ajouter des queries si nécessaire

### Fichiers de référence (à consulter, ne pas modifier)
- `/src/app/inscription/registration-form.tsx` - Référence pour le formulaire et la logique de vérification téléphone
- `/src/app/actions/registrations.ts` - Référence pour `registerPlayer` et `updateRegistrationStatusAction`
- `/src/lib/phone-utils.ts` - Utilitaires pour normalisation téléphone

## Spécifications fonctionnelles

### 1. Bouton "Créer un joueur"
**Emplacement**: Dans `UsersValidatedTab.tsx`, au niveau du titre "Joueurs validés" (ligne ~110-115)

**Position**: À droite du titre, aligné horizontalement

**Style**:
```tsx
<button
  onClick={() => setShowCreateModal(true)}
  className="gradient-primary rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
>
  ➕ Créer un joueur
</button>
```

### 2. Modale de création

**Structure**: Composant modal avec backdrop

**États à gérer**:
- `showCreateModal`: boolean pour afficher/masquer la modale
- `mode`: "new" | "existing" pour le toggle
- `phone`: string pour le numéro de téléphone
- `phoneStatus`: "idle" | "success" | "error"
- `phoneMessage`: string | null
- `verifiedPlayer`: VerifiedPlayer | null (même type que RegistrationForm)
- `isVerifying`: boolean

**Toggle nouveau/existant**:
Reprendre EXACTEMENT le même système que dans `RegistrationForm.tsx` (lignes 222-264):
- Label: "Avez-vous déjà participé à un tournoi ?"
- Toggle switch visuel (border orange quand mode="existing")
- Info box emerald en mode "existing" avec texte d'explication
- Bouton "Vérifier" qui apparaît uniquement en mode "existing"

### 3. Vérification du téléphone (mode "existing")

**Endpoint à utiliser**: `/api/tournaments/${tournamentId}/verify-phone`

**Logique** (reprendre de `RegistrationForm.tsx` lignes 117-182):
1. Normaliser le téléphone avec `normalizePhoneNumber()`
2. Appeler l'API avec POST + body JSON `{ phone: normalizedPhone }`
3. Si succès: afficher le profil joueur avec badge emerald
4. Si erreur: afficher message d'erreur avec badge rouge + option de passer en mode "new"

**Profil joueur trouvé** (même affichage que RegistrationForm lignes 310-353):
- Photo de profil (ou initiales)
- Nom complet
- Téléphone + email
- Niveau
- Nombre de tournois précédents

### 4. Formulaire de création (mode "new")

**Champs obligatoires**:
- Téléphone (avec validation format)
- Prénom
- Nom
- Niveau (select 1-7)
- Préférence de jeu (radio: droite/gauche/aucune)

**Champs optionnels**:
- Email
- Classement (conditionnel: si radio "Êtes-vous classé ?" = "oui")

**Section Questionnaire**:
Même structure que RegistrationForm (lignes 395-503):
- Border `border-orange-500/20`
- Background `bg-orange-500/5`
- Titre "📋 Questionnaire" avec classe `text-orange-400`

**Validation**:
- Formats téléphone acceptés (même validation que RegistrationForm)
- Tous les champs requis doivent être remplis

### 5. Server Action `createPlayerByAdminAction`

**Fichier**: `/src/app/actions/registrations.ts`

**Signature**:
```typescript
export async function createPlayerByAdminAction(
  prevState: any,
  formData: FormData
): Promise<{ status: "ok" | "error"; message: string; playerId?: string; tournamentId?: string }> {
```

**Paramètres FormData attendus**:
- `mode`: "new" | "existing"
- `phone`: string (normalisé)
- `tournamentId`: string
- `adminToken`: string
- Si mode="new": `firstName`, `lastName`, `email?`, `level`, `ranking?`, `playPreference`
- Si mode="existing": `playerId`

**Logique**:

1. **Vérifier le token admin** avec `assertAdminToken(adminToken)`

2. **Si mode="existing"**:
   - Récupérer le player existant via `playerId`
   - Vérifier qu'il n'est pas déjà inscrit au tournoi
   - Créer une registration avec `status='approved'`

3. **Si mode="new"**:
   - Normaliser le téléphone
   - **IMPORTANT**: Vérifier si le téléphone existe déjà dans `players`
     - Si oui: retourner erreur "Ce numéro existe déjà, utilisez le mode 'Joueur existant'"
   - Créer le player dans la table `players`
   - Créer la registration avec `status='approved'`

4. **Dans tous les cas**:
   - `status='approved'` (validation automatique)
   - `created_at=NOW()`
   - `updated_at=NOW()`

**SQL pour création registration**:
```sql
INSERT INTO registrations (
  player_id,
  tournament_id,
  status,
  created_at,
  updated_at
)
VALUES ($1, $2, 'approved', NOW(), NOW())
RETURNING id;
```

**Retour de la fonction**:
- En cas de succès: `{ status: "ok", message: "Joueur créé et validé avec succès", playerId, tournamentId }`
- En cas d'erreur: `{ status: "error", message: "Description de l'erreur" }`

### 6. Gestion du succès

Après création réussie:
1. Fermer la modale
2. Appeler `router.refresh()` pour recharger les données
3. Optionnel: Afficher un toast de succès (si vous avez un système de notifications)

### 7. Intégration dans UsersValidatedTab

**Modifications nécessaires**:

1. **Imports à ajouter**:
```typescript
import { useState } from "react"; // Si pas déjà présent
import { createPlayerByAdminAction } from "@/app/actions/registrations";
import { useFormState } from "react-dom";
import { formatPhoneForDisplay, normalizePhoneNumber } from "@/lib/phone-utils";
```

2. **Props à ajouter**:
```typescript
type UsersValidatedTabProps = {
  // ... props existantes
  tournamentId: string; // NOUVEAU: nécessaire pour la création
};
```

3. **États pour la modale**:
```typescript
const [showCreateModal, setShowCreateModal] = useState(false);
const [mode, setMode] = useState<"new" | "existing">("new");
const [phone, setPhone] = useState("");
const [phoneStatus, setPhoneStatus] = useState<"idle" | "success" | "error">("idle");
const [phoneMessage, setPhoneMessage] = useState<string | null>(null);
const [verifiedPlayer, setVerifiedPlayer] = useState<VerifiedPlayer | null>(null);
const [isVerifying, setIsVerifying] = useState(false);
```

4. **Structure du composant modal**:
```tsx
{showCreateModal && (
  <div className="fixed inset-0 z-50">
    {/* Backdrop */}
    <div
      className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      onClick={() => setShowCreateModal(false)}
    />

    {/* Modal content */}
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        {/* Bouton fermer */}
        <button
          onClick={() => setShowCreateModal(false)}
          className="absolute right-4 top-4 text-2xl leading-none text-white/60 hover:text-white"
        >
          ✕
        </button>

        {/* Titre */}
        <div className="mb-8">
          <h2 className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-3xl font-bold text-transparent">
            Créer un nouveau joueur
          </h2>
          <p className="mt-2 text-sm text-white/60">
            Le joueur sera automatiquement validé et pourra participer au tournoi
          </p>
        </div>

        {/* Toggle nouveau/existant */}
        {/* ... reprendre de RegistrationForm ... */}

        {/* Formulaire */}
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="tournamentId" value={tournamentId} />
          <input type="hidden" name="adminToken" value={adminToken} />
          <input type="hidden" name="mode" value={mode} />

          {/* ... champs du formulaire ... */}

          {/* Info box validation automatique */}
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            ✓ Ce joueur sera immédiatement validé et ajouté à la liste des participants.
          </div>

          {/* Boutons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="flex-1 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/15"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(255,107,53,0.3)]"
            >
              Créer et valider
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
)}
```

### 8. Mise à jour de la page admin

**Fichier**: `/src/app/tournaments/[slug]/admin/page.tsx`

**Modification nécessaire**:
Passer `tournament.id` à `UsersValidatedTab`:

```typescript
<UsersValidatedTab
  registrations={registrations}
  statusCounts={counts}
  adminToken={adminToken}
  paymentConfig={paymentConfig}
  tournamentId={tournament.id} // NOUVEAU
/>
```

## Types TypeScript

**Type pour joueur vérifié** (reprendre de RegistrationForm):
```typescript
type VerifiedPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  photoUrl: string | null;
  level: string | null;
  isRanked: boolean;
  ranking: string | null;
  playPreference: string | null;
  tournamentsPlayed: number;
};
```

## Gestion des erreurs

**Cas d'erreur à gérer**:
1. Token admin invalide → Retour erreur 401
2. Téléphone déjà utilisé en mode "new" → Message "Ce numéro existe déjà"
3. Joueur déjà inscrit au tournoi → Message "Ce joueur est déjà inscrit"
4. Champs obligatoires manquants → Validation HTML5 + erreur serveur
5. Format téléphone invalide → Message d'erreur avec formats acceptés

**Affichage des erreurs**:
```tsx
{state?.status === "error" && (
  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
    {state.message}
  </div>
)}
```

## Validation et sécurité

1. **Token admin obligatoire**: Toutes les actions doivent vérifier `assertAdminToken()`
2. **Normalisation téléphone**: Utiliser `normalizePhoneNumber()` AVANT toute insertion
3. **Validation SQL**: Utiliser des paramètres préparés ($1, $2, etc.)
4. **Unicité téléphone**: Vérifier AVANT insertion si le numéro n'existe pas déjà
5. **Validation côté serveur**: Ne pas se fier uniquement à la validation HTML5

## Comportement attendu

### Scénario 1: Création nouveau joueur
1. Admin clique "Créer un joueur"
2. Modale s'ouvre en mode "new" (par défaut)
3. Admin remplit le formulaire
4. Admin clique "Créer et valider"
5. Joueur créé avec status="approved"
6. Modale se ferme
7. Liste des joueurs se rafraîchit avec le nouveau joueur

### Scénario 2: Création joueur existant
1. Admin clique "Créer un joueur"
2. Admin toggle vers "Joueur existant"
3. Admin saisit le téléphone et clique "Vérifier"
4. Si trouvé: profil s'affiche
5. Admin clique "Créer et valider"
6. Registration créée avec status="approved"
7. Modale se ferme
8. Liste des joueurs se rafraîchit

### Scénario 3: Téléphone déjà utilisé
1. Admin en mode "new" saisit un téléphone existant
2. Soumission du formulaire
3. Erreur: "Ce numéro existe déjà, utilisez le mode 'Joueur existant'"
4. Admin peut corriger ou passer en mode "existing"

## Points d'attention

⚠️ **IMPORTANT**:
1. Le joueur créé doit avoir `status='approved'` (pas `pending`)
2. Utiliser EXACTEMENT les mêmes validations téléphone que RegistrationForm
3. Reprendre le même UI/UX que RegistrationForm pour cohérence
4. Ne pas oublier `router.refresh()` après création réussie
5. Gérer la fermeture modale avec touche Échap
6. Vérifier que tournamentId est bien passé en props

## Checklist d'implémentation

- [ ] Ajouter le bouton "Créer un joueur" dans UsersValidatedTab
- [ ] Créer la modale avec toggle nouveau/existant
- [ ] Implémenter la vérification téléphone (mode existing)
- [ ] Créer le formulaire nouveau joueur avec tous les champs
- [ ] Créer la Server Action `createPlayerByAdminAction`
- [ ] Gérer les cas d'erreur (téléphone existant, déjà inscrit, etc.)
- [ ] Ajouter `tournamentId` aux props de UsersValidatedTab
- [ ] Passer `tournament.id` depuis la page admin
- [ ] Tester la création en mode "new"
- [ ] Tester la création en mode "existing"
- [ ] Tester les cas d'erreur
- [ ] Vérifier que le joueur apparaît bien dans la liste après création
- [ ] Vérifier que router.refresh() fonctionne correctement

## Références de code

**Classes CSS personnalisées** (définies dans tailwind.config.ts et globals.css):
- `gradient-primary`: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)
- `shadow-glow`: 0 12px 24px -12px rgba(255, 107, 53, 0.45)
- `bg-status-approved`: #7BD89B
- `text-brand-charcoal`: #1E1E2E

**Utilitaires téléphone** (`/src/lib/phone-utils.ts`):
- `normalizePhoneNumber(phone: string): string | null`
- `formatPhoneForDisplay(phone: string): string`

---

**Note**: Ce prompt est optimisé pour une implémentation avec GPT-5.2 Codex via Roo dans VSCode. Suivez les étapes dans l'ordre et référez-vous aux fichiers mentionnés pour la cohérence du code.
