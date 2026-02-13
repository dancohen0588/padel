# Prompt Roo : Correction Page d'Inscription - Problème slug vs id

## Problème Identifié

L'URL `/tournaments/[id]/register` ne fonctionne pas car :

1. **Le lien** dans `UpcomingTournaments.tsx` utilise l'**id** :
   ```tsx
   href={`/tournaments/${tournament.id}/register`}
   // Exemple: /tournaments/90a3396d-389b-4f0d-9308-2770459d3f50/register
   ```

2. **La page** `src/app/tournaments/[slug]/register/page.tsx` cherche par **slug** :
   ```typescript
   const tournament = tournaments.find((entry) => entry.slug === params.slug);
   ```

3. Résultat : `tournament` est `undefined` et le message "Tournoi introuvable" s'affiche.

## Solution Recommandée : Utiliser l'ID

Modifier la page pour rechercher par **id** au lieu de **slug**.

### Fichier à Modifier

`src/app/tournaments/[slug]/register/page.tsx`

### Modifications

#### 1. Changer le Nom du Paramètre (Optionnel mais Recommandé)

Renommer le dossier :
```bash
mv src/app/tournaments/[slug] src/app/tournaments/[id]
```

Ou garder `[slug]` et interpréter le paramètre comme un id (plus simple).

#### 2. Modifier la Logique de Recherche

**AVANT** (lignes 15-16) :
```typescript
const tournaments = await getTournaments("registration");
const tournament = tournaments.find((entry) => entry.slug === params.slug);
```

**APRÈS** :
```typescript
const tournaments = await getTournaments("registration");
const tournament = tournaments.find((entry) => entry.id === params.slug);
// Note: params.slug contient en réalité l'id du tournoi
```

Ou mieux, renommer le paramètre pour plus de clarté :

```typescript
type TournamentRegisterPageProps = {
  params: { slug: string }; // Contient l'id du tournoi (mal nommé)
};

export default async function TournamentRegisterPage({
  params,
}: TournamentRegisterPageProps) {
  const tournamentId = params.slug; // Le "slug" est en fait un id
  const tournaments = await getTournaments("registration");
  const tournament = tournaments.find((entry) => entry.id === tournamentId);

  console.log("[TournamentRegisterPage] tournamentId", tournamentId);
  console.log(
    "[TournamentRegisterPage] registration tournaments",
    tournaments.map((entry) => ({ id: entry.id, name: entry.name }))
  );
  console.log(
    "[TournamentRegisterPage] matched",
    tournament ? { id: tournament.id, name: tournament.name } : null
  );

  return (
    // ... reste du code
  );
}
```

### Code Complet Corrigé

```tsx
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SectionHeader } from "@/components/ui/section-header";
import { RegistrationForm } from "@/app/inscription/registration-form";
import { getTournaments } from "@/lib/queries";
import { registerPlayerForTournament } from "@/app/actions/registrations";

type TournamentRegisterPageProps = {
  params: { slug: string }; // En réalité contient l'id
};

export default async function TournamentRegisterPage({
  params,
}: TournamentRegisterPageProps) {
  const tournamentId = params.slug; // Le paramètre "slug" contient l'id
  const tournaments = await getTournaments("registration");

  // CORRECTION : Chercher par id au lieu de slug
  const tournament = tournaments.find((entry) => entry.id === tournamentId);

  console.log("[TournamentRegisterPage] tournamentId", tournamentId);
  console.log(
    "[TournamentRegisterPage] registration tournaments",
    tournaments.map((entry) => ({ id: entry.id, name: entry.name }))
  );
  console.log(
    "[TournamentRegisterPage] matched",
    tournament ? { id: tournament.id, name: tournament.name } : null
  );

  return (
    <div className="min-h-screen bg-brand-gray">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <SectionHeader
          title="Inscription joueur"
          subtitle={
            tournament
              ? `Rejoins ${tournament.name} en quelques secondes. On valide rapidement chaque inscription.`
              : "Rejoins le tournoi du moment en quelques secondes. On valide rapidement chaque inscription."
          }
        />
        <div className="mt-8">
          {tournament ? (
            <RegistrationForm
              action={async (prevState, formData) => {
                "use server";
                // Passer l'id du tournoi au lieu du slug
                formData.set("tournamentId", tournament.id);
                return registerPlayerForTournament(prevState, formData);
              }}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
              Tournoi introuvable. Vérifie le lien ou reviens plus tard.
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
```

## Alternative : Utiliser le Slug (Si Disponible)

Si vous voulez vraiment utiliser des slugs, il faut :

### 1. Ajouter le Slug dans UpcomingTournaments

**Modifier le type** dans `src/components/home/UpcomingTournaments.tsx` :
```typescript
type UpcomingTournament = {
  id: string;
  slug: string; // AJOUTER
  name: string;
  date: string;
  location: string | null;
  status: TournamentStatus;
  max_participants: number | null;
  current_participants: number;
};
```

**Modifier le lien** :
```tsx
<Link
  href={`/tournaments/${tournament.slug}/register`} // Utiliser slug au lieu de id
  className="..."
>
  S'inscrire
</Link>
```

### 2. Modifier la Requête dans page.tsx

La requête qui récupère les tournois doit inclure le champ `slug` :

```typescript
const tournaments = await database`
  SELECT
    t.id,
    t.slug,  -- AJOUTER
    t.name,
    t.start_date as date,
    t.location,
    t.status,
    t.max_participants,
    COUNT(p.id)::text as current_participants
  FROM tournaments t
  LEFT JOIN participations p ON p.tournament_id = t.id
  WHERE t.status IN ('upcoming', 'registration', 'ongoing')
  GROUP BY t.id, t.slug, t.name, t.start_date, t.location, t.status, t.max_participants
  ORDER BY t.start_date ASC
  LIMIT 5
`;
```

### 3. Vérifier que les Tournois ont un Slug

```sql
SELECT id, name, slug FROM tournaments WHERE slug IS NULL OR slug = '';
```

Si des tournois n'ont pas de slug, les générer :

```sql
-- Générer des slugs pour les tournois qui n'en ont pas
UPDATE tournaments
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug = '';
```

## Recommandation

**Utiliser l'id** (Solution 1) est plus simple et plus fiable car :
- ✅ Pas besoin de générer/maintenir des slugs
- ✅ Les ids sont toujours uniques
- ✅ Pas de conflit de noms
- ✅ Moins de changements nécessaires

Les slugs sont utiles pour le SEO, mais pour une application interne de gestion de tournois, les ids UUID sont suffisants.

## Checklist

- [ ] Modifier `src/app/tournaments/[slug]/register/page.tsx`
- [ ] Changer `entry.slug === params.slug` en `entry.id === tournamentId`
- [ ] Tester l'URL : http://localhost:3000/tournaments/90a3396d-389b-4f0d-9308-2770459d3f50/register
- [ ] Vérifier que le formulaire s'affiche correctement
- [ ] Vérifier que le nom du tournoi est affiché
- [ ] Vérifier les logs console pour confirmer le match

## Test de Vérification

Après la correction, vous devriez voir dans les logs :

```
[TournamentRegisterPage] tournamentId 90a3396d-389b-4f0d-9308-2770459d3f50
[TournamentRegisterPage] registration tournaments [
  { id: '90a3396d-389b-4f0d-9308-2770459d3f50', name: 'Test 5' }
]
[TournamentRegisterPage] matched { id: '90a3396d-389b-4f0d-9308-2770459d3f50', name: 'Test 5' }
```

Et la page devrait afficher le formulaire d'inscription avec le titre "Rejoins Test 5 en quelques secondes."
