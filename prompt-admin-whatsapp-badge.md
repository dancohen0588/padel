# Prompt - Badge WhatsApp dans l'Admin Tournoi

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

Ajouter un **badge WhatsApp** dans l'interface admin des tournois (`/tournaments/[slug]/admin`) pour indiquer quels joueurs ont rejoint le groupe WhatsApp.

### Fonctionnalités

✅ **Badge visuel** : Afficher un badge vert "WhatsApp" pour les joueurs ayant cliqué
✅ **Badge gris** : Afficher "Pas sur WhatsApp" pour les autres
✅ **Tooltip** : Au survol du badge vert, afficher la date/heure du clic
✅ **Statistique** : Card "Sur WhatsApp" avec le décompte
✅ **Filtres** : Boutons pour filtrer "Sur WhatsApp" / "Pas sur WhatsApp"
✅ **Animation** : Pulse subtil sur le badge vert

---

# 🗄️ PARTIE 1 : BACKEND - Requête SQL

## 1.1 - Modification de la Requête des Joueurs

### Fichier à modifier : `src/app/tournaments/[slug]/admin/page.tsx`

Dans la requête SQL qui récupère la liste des joueurs inscrits au tournoi, **ajouter** :

```typescript
const registrations = await database<
  Array<{
    id: string;
    player_id: string;
    player_first_name: string;
    player_last_name: string;
    player_email: string | null;
    player_phone: string;
    player_level: string | null;
    player_photo_url: string | null;
    status: string;
    registered_at: string;
    whatsapp_joined_tournaments: unknown;  // ⬅️ AJOUTER
  }>
>`
  SELECT
    r.id,
    r.player_id,
    p.first_name as player_first_name,
    p.last_name as player_last_name,
    p.email as player_email,
    p.phone as player_phone,
    p.level as player_level,
    p.photo_url as player_photo_url,
    r.status,
    r.registered_at::text,
    p.whatsapp_joined_tournaments  -- ⬅️ AJOUTER
  FROM registrations r
  JOIN players p ON p.id = r.player_id
  WHERE r.tournament_id = ${tournamentId}
  ORDER BY r.registered_at DESC
`;
```

## 1.2 - Mapper les Données pour le Frontend

**Ajouter** une fonction pour vérifier si un joueur a rejoint WhatsApp :

```typescript
type WhatsAppJoin = {
  tournamentId: string;
  joinedAt: string;
};

const mappedRegistrations = registrations.map((reg) => {
  const whatsappJoins = (reg.whatsapp_joined_tournaments as WhatsAppJoin[]) || [];
  const hasJoinedWhatsApp = whatsappJoins.some(
    (join) => join.tournamentId === tournamentId
  );
  const whatsappJoinDate = hasJoinedWhatsApp
    ? whatsappJoins.find((join) => join.tournamentId === tournamentId)?.joinedAt
    : null;

  return {
    id: reg.id,
    playerId: reg.player_id,
    firstName: reg.player_first_name,
    lastName: reg.player_last_name,
    email: reg.player_email,
    phone: reg.player_phone,
    level: reg.player_level,
    photoUrl: reg.player_photo_url,
    status: reg.status,
    registeredAt: reg.registered_at,
    hasJoinedWhatsApp,
    whatsappJoinDate,
  };
});
```

## 1.3 - Calculer les Statistiques

**Ajouter** le calcul du nombre de joueurs sur WhatsApp :

```typescript
const stats = {
  totalPlayers: mappedRegistrations.length,
  paidPlayers: mappedRegistrations.filter((r) => r.status === "approved").length,
  pendingPlayers: mappedRegistrations.filter((r) => r.status === "pending").length,
  onWhatsApp: mappedRegistrations.filter((r) => r.hasJoinedWhatsApp).length,  // ⬅️ AJOUTER
};
```

---

# 🎨 PARTIE 2 : FRONTEND - Composants

## 2.1 - Types TypeScript

### Fichier à créer/modifier : `src/types/admin.ts` (ou directement dans le composant)

```typescript
export type PlayerRegistration = {
  id: string;
  playerId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  level: string | null;
  photoUrl: string | null;
  status: "pending" | "approved" | "rejected";
  registeredAt: string;
  hasJoinedWhatsApp: boolean;
  whatsappJoinDate: string | null;
};

export type TournamentStats = {
  totalPlayers: number;
  paidPlayers: number;
  pendingPlayers: number;
  onWhatsApp: number;
};
```

---

## 2.2 - Composant Badge WhatsApp

### Fichier à créer : `src/components/admin/WhatsAppBadge.tsx`

```typescript
"use client";

import { useState } from "react";

type WhatsAppBadgeProps = {
  hasJoined: boolean;
  joinedAt?: string | null;
};

export function WhatsAppBadge({ hasJoined, joinedAt }: WhatsAppBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!hasJoined) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/50">
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        Pas sur WhatsApp
      </span>
    );
  }

  const formattedDate = joinedAt
    ? new Date(joinedAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className="relative inline-block group"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className="inline-flex items-center gap-1 rounded-full border border-green-400/30 bg-green-500/15 px-2.5 py-1 text-[11px] font-semibold text-green-300 cursor-pointer"
        style={{
          animation: 'subtlePulse 2s ease-in-out infinite'
        }}
      >
        <svg
          className="h-3 w-3"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
        WhatsApp
      </span>

      {/* Tooltip */}
      {showTooltip && formattedDate && (
        <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white shadow-lg">
          Rejoint le {formattedDate}
          <div className="absolute left-1/2 top-full -translate-x-1/2">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Note** : Ajouter l'animation CSS dans le fichier global ou dans le composant :

```css
@keyframes subtlePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

---

## 2.3 - Card Statistique WhatsApp

### Fichier à modifier : `src/components/admin/tabs/UsersValidatedTab.tsx`

Dans la section des statistiques (cards), **modifier** la grille pour ajouter une 4ème card :

```tsx
{/* Modifier le grid de md:grid-cols-3 à md:grid-cols-4 */}
<Card className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-card">
  <div className="grid gap-4 md:grid-cols-4">
    {/* Card Joueurs validés */}
    <div className="space-y-1 rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-2xl font-semibold">{approvedCount}</p>
      <p className="text-xs uppercase tracking-wide text-white/60">
        Joueurs validés
      </p>
    </div>

    {/* Card Équipes formées */}
    <div className="space-y-1 rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-2xl font-semibold">{teamsFormed}</p>
      <p className="text-xs uppercase tracking-wide text-white/60">
        Équipes formées
      </p>
    </div>

    {/* Card Taux de validation */}
    <div className="space-y-1 rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-2xl font-semibold">{approvalRate}%</p>
      <p className="text-xs uppercase tracking-wide text-white/60">
        Taux de validation
      </p>
    </div>

    {/* Card WhatsApp - ⬅️ NOUVEAU */}
    <div className="space-y-1 rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-transparent p-4">
      <div className="flex items-center gap-2">
        <p className="text-2xl font-semibold">{onWhatsAppCount}</p>
        <svg
          className="h-5 w-5 text-green-400"
          fill="currentColor"
          viewBox="0 0 24 24"
          style={{ animation: 'subtlePulse 2s ease-in-out infinite' }}
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      </div>
      <p className="text-xs uppercase tracking-wide text-green-300/80">
        Sur WhatsApp
      </p>
    </div>
  </div>
</Card>
```

**Dans le composant**, ajouter le calcul du compte :

```typescript
const onWhatsAppCount = approved.filter((reg) => reg.hasJoinedWhatsApp).length;
```

---

## 2.4 - Barre de Recherche (déjà existante)

L'interface actuelle utilise déjà une barre de recherche dans `UsersValidatedTab.tsx`. Le badge WhatsApp s'intégrera directement dans la liste filtrée existante. Aucune modification n'est nécessaire pour la recherche.

---

## 2.5 - Intégration du Badge dans les Cards

### Fichier à modifier : `src/components/admin/tabs/UsersValidatedTab.tsx`

Dans la grille de cards des joueurs, **ajouter** le badge WhatsApp après le statut "Validé" :

```tsx
import { WhatsAppBadge } from "@/components/admin/WhatsAppBadge";

// Dans la grille de cards (ligne ~111)
<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
  {approved.length ? (
    approved.map((registration) => {
      const rankingValue = registration.player.ranking?.toString().trim();
      const playPreferenceValue = registration.player.play_preference?.toString().trim();

      return (
        <Card
          key={registration.id}
          className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white shadow-card"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
              {buildInitials(
                registration.player.first_name,
                registration.player.last_name
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div className="space-y-1">
                <p className="text-base font-semibold">
                  {registration.player.first_name} {registration.player.last_name}
                </p>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Validé</span>
                </div>
              </div>
              <div className="space-y-2 text-sm text-white/70">
                {registration.player.phone ? (
                  <div className="flex items-center gap-2">
                    <span>📱</span>
                    <span>{registration.player.phone}</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <span>✉️</span>
                  <span>{registration.player.email ?? "N/A"}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60">
                  <span>
                    Niveau :{" "}
                    {registration.player.level
                      ? LEVEL_LABELS[registration.player.level] ?? registration.player.level
                      : "N/A"}
                  </span>
                  <span>•</span>
                  <span>
                    Classement :{" "}
                    {rankingValue || "N/A"}
                  </span>
                  {playPreferenceValue && (
                    <>
                      <span>•</span>
                      <span>
                        Côté préféré :{" "}
                        {playPreferenceValue}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            {/* Badge WhatsApp - ⬅️ AJOUTER ICI */}
            <WhatsAppBadge
              hasJoined={registration.hasJoinedWhatsApp}
              joinedAt={registration.whatsappJoinDate}
            />

            <form
              action={async (formData) => {
                await updateRegistrationStatusAction(formData);
                router.refresh();
              }}
            >
              <input
                type="hidden"
                name="registrationId"
                value={registration.id}
              />
              <input type="hidden" name="status" value="pending" />
              <input type="hidden" name="adminToken" value={adminToken} />
              <GradientButton
                type="submit"
                className="bg-white/10 text-white"
              >
                ↶ Repasser en attente
              </GradientButton>
            </form>
          </div>
        </Card>
      );
    })
  ) : (
    <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-10 text-center text-sm text-white/60">
      Aucun joueur validé.
    </div>
  )}
</div>
```

---

## 2.6 - Bloc d'Information (Légende) - OPTIONNEL

Si vous souhaitez ajouter une légende explicative, **ajouter** en bas de la page après la grille :

```tsx
<div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent p-4">
  <div className="flex items-start gap-3">
    <svg
      className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-400"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
    <div className="flex-1">
      <p className="text-sm font-semibold text-blue-300">
        À propos du badge WhatsApp
      </p>
      <p className="mt-1 text-xs text-white/70">
        Le badge{" "}
        <span className="mx-1 inline-flex items-center gap-1 rounded-full border border-green-400/30 bg-green-500/15 px-2 py-0.5 text-[11px] font-semibold text-green-300">
          <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          WhatsApp
        </span>{" "}
        indique que le joueur a cliqué sur "Rejoindre le groupe WhatsApp" depuis
        sa page de confirmation. Survolez le badge pour voir la date et l'heure
        exactes du clic.
      </p>
    </div>
  </div>
</div>
```

---

# ✅ CHECKLIST COMPLÈTE

## Backend

- [ ] Requête SQL modifiée pour inclure `whatsapp_joined_tournaments`
- [ ] Mapping des données pour extraire `hasJoinedWhatsApp` et `whatsappJoinDate`
- [ ] Calcul de la statistique `onWhatsApp`

## Frontend - Types

- [ ] Type `PlayerRegistration` avec `hasJoinedWhatsApp` et `whatsappJoinDate`
- [ ] Type `TournamentStats` avec `onWhatsApp`

## Frontend - Composants

- [ ] Composant `WhatsAppBadge` créé
- [ ] Badge vert avec animation pulse
- [ ] Badge gris pour "Pas sur WhatsApp"
- [ ] Tooltip au survol avec date/heure formatée
- [ ] Card statistique WhatsApp ajoutée
- [ ] Filtres "Sur WhatsApp" et "Pas sur WhatsApp" ajoutés
- [ ] État `activeFilter` pour gérer les filtres
- [ ] Colonne "Statuts" dans le tableau
- [ ] Badge WhatsApp intégré dans le tableau
- [ ] Bloc d'information (légende) ajouté

## UX/UI

- [ ] Animation pulse sur le badge vert
- [ ] Tooltip positionné correctement (au-dessus, centré)
- [ ] Couleurs cohérentes (vert pour WhatsApp, gris pour non)
- [ ] Responsive (flex-wrap sur les badges)
- [ ] Hover states sur les filtres

---

# 🚀 ORDRE D'EXÉCUTION RECOMMANDÉ

1. **Backend** → Modifier la requête SQL dans `page.tsx`
2. **Types** → Ajouter les types `PlayerRegistration` et `TournamentStats`
3. **Composant Badge** → Créer `WhatsAppBadge.tsx`
4. **Stats** → Ajouter la card "Sur WhatsApp"
5. **Filtres** → Ajouter l'état et les boutons de filtre
6. **Tableau** → Intégrer le badge dans la colonne "Statuts"
7. **Légende** → Ajouter le bloc d'information
8. **Test** → Vérifier tous les cas (avec/sans WhatsApp, tooltip, filtres)

---

# 🧪 TESTS MANUELS

## Données

1. **Joueurs avec WhatsApp** → Badge vert visible, animation pulse
2. **Joueurs sans WhatsApp** → Badge gris visible
3. **Tooltip** → Survol badge vert → Date/heure affichées
4. **Card stat** → Nombre correct de joueurs sur WhatsApp

## Filtres

1. **Filtre "Tous"** → Tous les joueurs affichés
2. **Filtre "Sur WhatsApp"** → Seulement joueurs avec badge vert
3. **Filtre "Pas sur WhatsApp"** → Seulement joueurs avec badge gris
4. **Combinaison** → Filtre "Payé" + WhatsApp

## Responsive

1. **Mobile** → Badges en flex-wrap
2. **Tablet** → Cards en grille 2x2
3. **Desktop** → Cards en ligne 1x4

---

# 📊 RÉCAPITULATIF DES FICHIERS

```
Fichiers à créer (1) :
└── src/components/admin/WhatsAppBadge.tsx

Fichiers à modifier (1) :
└── src/app/tournaments/[slug]/admin/page.tsx
   ├── Requête SQL (+1 champ)
   ├── Mapping données (+2 champs)
   ├── Calcul stats (+1 stat)
   ├── Card WhatsApp (+1 card)
   ├── Filtres (+état, +2 boutons)
   ├── Tableau (+import, +colonne)
   └── Légende (+bloc info)
```

---

# 💡 NOTES IMPORTANTES

## Animation Pulse

L'animation pulse est subtile et appliquée uniquement à l'icône WhatsApp du badge vert. Elle utilise la classe Tailwind `animate-pulse` pour un effet visuel discret.

## Tooltip

Le tooltip utilise des classes CSS avec `position: absolute` et `z-index`. Il est contrôlé par l'état local `showTooltip` et les événements `onMouseEnter` / `onMouseLeave`.

## Performance

- Le filtrage est fait côté client (données déjà chargées)
- Pas de requête supplémentaire lors du changement de filtre
- Animation CSS native (performante)

## Accessibilité

- Contraste suffisant sur les badges
- Tooltip accessible au hover
- Labels clairs sur les filtres

---

Bonne implémentation ! 🎾💬✅
