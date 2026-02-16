# Implémentation : Têtes de série (Seeded Teams) pour tournoi de padel

## Contexte technique

**Stack :**
- Next.js 14+ avec App Router
- TypeScript (strict mode)
- PostgreSQL avec requêtes SQL directes (pas de Prisma)
- Tailwind CSS avec thème dark (#1E1E2E)
- Server Actions pour les mutations
- DnD-kit pour le drag & drop

**Fichiers principaux concernés :**
- `/src/components/tournaments/admin/TournamentConfigAdmin.tsx` - Composant principal avec onglets Équipes/Poules
- `/src/app/tournaments/[slug]/admin/page.tsx` - Page admin avec tabs
- `/src/lib/types.ts` - Types TypeScript
- `/src/app/actions/teams.ts` - Server Actions pour les équipes

## Objectif

Ajouter un système de **têtes de série** (seeded teams) permettant de désigner certaines équipes comme favorites, avec les contraintes suivantes :
- Maximum de têtes de série = nombre de poules du tournoi
- Seules les équipes complètes (2 joueurs) peuvent être désignées
- Interface dans l'onglet "Équipes" avec édition
- Affichage read-only dans l'onglet "Poules"

## Validation visuelle

Un fichier HTML de validation est disponible : `/equipes-tetes-de-serie.html`
Il montre exactement le rendu attendu avec :
- Icône étoile clickable (⭐/☆) sur chaque carte d'équipe
- Compteur "⭐ X/Y" où Y = nombre de poules
- Badge "🏆 Tête de série" sur les équipes désignées
- Désactivation automatique quand limite atteinte

## Implémentation requise

### 1. Migration SQL

```sql
-- Ajouter la colonne is_seeded à la table teams
ALTER TABLE teams
ADD COLUMN is_seeded BOOLEAN DEFAULT FALSE;

-- Index pour optimiser les requêtes de têtes de série
CREATE INDEX idx_teams_seeded ON teams(tournament_id, is_seeded)
WHERE is_seeded = TRUE;
```

### 2. Mise à jour des types TypeScript

Dans `/src/lib/types.ts`, ajouter au type `Team` :

```typescript
export type Team = {
  id: string;
  tournament_id: string;
  name: string | null;
  is_seeded?: boolean;  // Nouveau champ
  created_at: string;
};
```

### 3. Nouvelle Server Action

Créer dans `/src/app/actions/teams.ts` :

```typescript
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function toggleTeamSeededAction(
  teamId: string,
  tournamentId: string,
  adminToken: string
): Promise<{ success: boolean; error?: string; isSeeded?: boolean }> {
  try {
    // Vérifier le token admin
    const tournament = await db.query(
      `SELECT id, admin_token, config FROM tournaments WHERE id = $1`,
      [tournamentId]
    );

    if (!tournament.rows[0] || tournament.rows[0].admin_token !== adminToken) {
      return { success: false, error: "Non autorisé" };
    }

    // Récupérer l'équipe et compter ses joueurs
    const teamResult = await db.query(
      `SELECT t.id, t.is_seeded, COUNT(tp.player_id) as player_count
       FROM teams t
       LEFT JOIN team_players tp ON t.id = tp.team_id
       WHERE t.id = $1 AND t.tournament_id = $2
       GROUP BY t.id, t.is_seeded`,
      [teamId, tournamentId]
    );

    if (!teamResult.rows[0]) {
      return { success: false, error: "Équipe non trouvée" };
    }

    const team = teamResult.rows[0];
    const playerCount = parseInt(team.player_count);
    const currentSeeded = team.is_seeded || false;

    // Vérifier que l'équipe est complète
    if (!currentSeeded && playerCount < 2) {
      return {
        success: false,
        error: "Équipe incomplète. Ajoutez 2 joueurs avant de la désigner comme tête de série."
      };
    }

    // Si on veut activer, vérifier la limite
    if (!currentSeeded) {
      // Compter les têtes de série actuelles
      const seededCount = await db.query(
        `SELECT COUNT(*) as count FROM teams
         WHERE tournament_id = $1 AND is_seeded = TRUE`,
        [tournamentId]
      );

      const currentSeededCount = parseInt(seededCount.rows[0].count);

      // Récupérer le nombre de poules depuis la config
      const config = tournament.rows[0].config || {};
      const poolsCount = config.pools_count || config.poolsCount || 4;

      if (currentSeededCount >= poolsCount) {
        return {
          success: false,
          error: `Limite atteinte : ${poolsCount} têtes de série maximum (nombre de poules)`
        };
      }
    }

    // Toggle le statut
    const newSeededStatus = !currentSeeded;
    await db.query(
      `UPDATE teams SET is_seeded = $1 WHERE id = $2`,
      [newSeededStatus, teamId]
    );

    revalidatePath(`/tournaments/[slug]/admin`, "page");

    return { success: true, isSeeded: newSeededStatus };
  } catch (error) {
    console.error("[toggleTeamSeededAction] error:", error);
    return { success: false, error: "Erreur serveur" };
  }
}
```

### 4. Modifications du composant TournamentConfigAdmin.tsx

**A. Ajouter le state et la logique :**

```typescript
// Dans le composant TournamentConfigContent, ajouter :

const seededTeams = useMemo(() => {
  return new Set(localTeams.filter(t => t.is_seeded).map(t => t.id));
}, [localTeams]);

const seededCount = seededTeams.size;
const maxSeeded = poolsCount;

const handleToggleSeeded = async (teamId: string) => {
  const team = localTeams.find(t => t.id === teamId);
  if (!team) return;

  // Vérifier si l'équipe est complète
  const playerCount = teamPlayerMap.get(teamId)?.length ?? 0;
  if (playerCount < 2 && !team.is_seeded) {
    setToast("Équipe incomplète (2/2 requis)");
    return;
  }

  // Vérifier la limite si on veut ajouter
  if (!team.is_seeded && seededCount >= maxSeeded) {
    setToast(`Limite atteinte (${maxSeeded} têtes de série max)`);
    return;
  }

  const result = await toggleTeamSeededAction(teamId, tournament.id, adminToken);

  if (!result.success) {
    setToast(result.error || "Erreur");
    return;
  }

  // Mettre à jour l'état local
  setLocalTeams(prev =>
    prev.map(t => t.id === teamId ? { ...t, is_seeded: result.isSeeded } : t)
  );

  setToast(result.isSeeded ? "Tête de série ajoutée" : "Tête de série retirée");
};
```

**B. Ajouter le compteur dans le header (ligne ~376) :**

```tsx
<div className="flex flex-wrap items-center justify-between gap-3">
  <div className="flex items-center gap-4">
    <p className="bg-gradient-to-br from-orange-400 to-amber-200 bg-clip-text text-sm font-semibold text-transparent">
      Équipes du tournoi
    </p>
    {/* Compteur de têtes de série */}
    <div
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
        seededCount >= maxSeeded
          ? "bg-gradient-to-r from-red-500/20 to-red-400/10 border border-red-400/30 text-red-300"
          : "bg-gradient-to-r from-amber-400/20 to-amber-300/10 border border-amber-400/30 text-amber-300"
      }`}
    >
      <span>⭐</span>
      <span className="ml-1">{seededCount}</span>
      <span className="text-white/50">/</span>
      <span>{maxSeeded}</span>
    </div>
  </div>
  <Button
    type="button"
    variant="outline"
    className="rounded-xl border-none bg-gradient-to-br from-orange-400 to-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:translate-y-[-1px] hover:shadow-lg"
    onClick={handleCreateTeam}
  >
    Créer une équipe
  </Button>
</div>
```

**C. Modifier la carte d'équipe (ligne ~391) :**

```tsx
{localTeams.map((team) => {
  const players = teamPlayerMap.get(team.id) ?? [];
  const isComplete = players.length >= 2;
  const isSeeded = team.is_seeded || false;
  const canBeSeeded = isComplete;
  const seededLimitReached = seededCount >= maxSeeded && !isSeeded;

  return (
    <div
      key={team.id}
      className={`rounded-2xl border p-4 transition ${
        isComplete
          ? "border-emerald-400/40 bg-emerald-500/5"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-center gap-2">
        <input
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white placeholder:text-white/30 focus:border-orange-400 focus:outline-none"
          placeholder="Nom de l'équipe"
          defaultValue={team.name ?? ""}
          onBlur={(event) => handleUpdateTeamName(team.id, event.target.value)}
        />

        {/* Bouton tête de série */}
        {players.length > 0 ? (
          <button
            type="button"
            onClick={() => handleToggleSeeded(team.id)}
            disabled={!canBeSeeded || seededLimitReached}
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-lg transition ${
              isSeeded
                ? "bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-lg"
                : canBeSeeded && !seededLimitReached
                ? "bg-white/10 hover:bg-white/20"
                : "bg-white/5 opacity-30 cursor-not-allowed"
            }`}
            title={
              !canBeSeeded
                ? "Équipe incomplète"
                : seededLimitReached
                ? `Limite atteinte (${maxSeeded} max)`
                : isSeeded
                ? "Retirer le statut de tête de série"
                : "Désigner comme tête de série"
            }
          >
            {isSeeded ? "⭐" : "☆"}
          </button>
        ) : (
          <button
            type="button"
            className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
            onClick={() => handleDeleteTeam(team.id)}
          >
            ✕
          </button>
        )}
      </div>

      {/* Badge tête de série */}
      {isSeeded && (
        <div className="mt-2 rounded-lg bg-gradient-to-r from-amber-400/20 to-amber-300/10 border border-amber-400/40 px-3 py-1.5 text-center text-xs font-semibold text-amber-300">
          🏆 Tête de série
        </div>
      )}

      {/* Reste du code inchangé : DroppableArea avec joueurs, etc. */}
      <DroppableArea
        id={`drop:team:${team.id}`}
        className="mt-3 space-y-2 rounded-xl border border-dashed border-white/15 bg-white/5 p-3"
      >
        {/* ... code existant pour les joueurs ... */}
      </DroppableArea>

      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
        {/* ... code existant pour le statut ... */}
      </div>
    </div>
  );
})}
```

**D. Affichage dans l'onglet Poules (read-only) - ligne ~577 :**

```tsx
<DraggableItem
  key={team.id}
  id={`team:${team.id}`}
  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs transition hover:border-white/30 hover:bg-white/10"
>
  <div className="flex items-center justify-between gap-2">
    <div className="flex-1">
      <p className="font-semibold text-white">{team.name || "Équipe"}</p>
      <p className="text-white/60">
        {(teamPlayerMap.get(team.id) ?? [])
          .map((playerId) => {
            const player = playerById.get(playerId);
            if (!player) return "";
            return player.pair_with
              ? `${player.first_name} ${player.last_name} (Binôme : ${player.pair_with})`
              : `${player.first_name} ${player.last_name}`;
          })
          .filter(Boolean)
          .join(" / ")}
      </p>
    </div>
    {/* Indicateur tête de série (non cliquable) */}
    {team.is_seeded && (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-base shadow-md">
        ⭐
      </div>
    )}
  </div>
</DraggableItem>
```

### 5. Import de la nouvelle action

En haut du fichier `TournamentConfigAdmin.tsx`, ajouter :

```typescript
import {
  assignPlayerToTeamAction,
  createTeamAction,
  deleteTeamAction,
  removePlayerFromTeamAction,
  updateTeamNameAction,
  toggleTeamSeededAction,  // NOUVEAU
} from "@/app/actions/teams";
```

## Tests à effectuer

1. ✅ Créer une équipe et vérifier que l'étoile est désactivée tant que l'équipe n'est pas complète
2. ✅ Ajouter 2 joueurs et vérifier que l'étoile devient cliquable
3. ✅ Désigner une équipe comme tête de série et vérifier l'affichage du badge
4. ✅ Atteindre la limite (nombre de poules) et vérifier que les autres étoiles sont désactivées
5. ✅ Retirer une tête de série et vérifier que d'autres étoiles redeviennent cliquables
6. ✅ Vérifier l'affichage read-only dans l'onglet "Poules"
7. ✅ Vérifier que le compteur se met à jour correctement
8. ✅ Tester le drag & drop fonctionne toujours correctement

## Contraintes importantes

- **Validation côté serveur** : Toujours vérifier le nombre de poules et le statut de l'équipe
- **Optimistic UI** : Mettre à jour `localTeams` immédiatement pour une UX fluide
- **Accessibilité** : Utiliser des `title` clairs sur les boutons pour expliquer l'état
- **Performance** : Utiliser `useMemo` pour calculer les équipes têtes de série
- **Cohérence** : Le badge et l'étoile doivent toujours être synchronisés

## Notes de style

- Utiliser les couleurs amber (amber-400, amber-300) pour tout ce qui concerne les têtes de série
- Conserver le thème dark existant (#1E1E2E)
- Utiliser les mêmes transitions et animations que le reste de l'interface
- Les gradients doivent être cohérents avec ceux utilisés ailleurs (orange, violet, emerald)

## Fichier de référence visuelle

Ouvrir `equipes-tetes-de-serie.html` dans un navigateur pour voir exactement le rendu attendu avant de coder.
