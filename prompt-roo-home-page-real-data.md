# Prompt Roo : Home Page avec Données Réelles + Page Démo

## Contexte
Brancher la home page avec les vraies données de la base de données et améliorer le bloc "Prochains tournois". Créer aussi une page démo séparée avec des données fictives pour présenter le design.

## Objectifs

### 1. Stats Réelles dans le Hero
Remplacer les données statiques par des requêtes DB pour afficher :
- **24 Tournois** → Nombre total de tournois (tous statuts)
- **486 Matchs joués** → Nombre total de matchs completed
- **64 Joueurs actifs** → Nombre de joueurs ayant participé à au moins un tournoi
- **1,458 Sets** → Nombre total de sets joués

### 2. Bloc "Prochains Tournois" Amélioré
- Récupérer les tournois avec `status IN ('upcoming', 'registration', 'ongoing')`
- Rendre le bloc plus visible et attractif
- Ajouter 2 boutons par tournoi :
  - **"S'inscrire"** → Lien vers la page d'inscription du tournoi
  - **"Accéder"** → Lien vers `/tournoi/en-cours` avec le tournoi sélectionné

### 3. Page Démo Séparée
Créer `/demo` qui affiche exactement le même design mais avec des données fictives pour présenter le rendu final

## Implémentation

### 1. Requêtes Database pour Stats Réelles

#### src/app/page.tsx (mise à jour)
```typescript
import { getDatabaseClient } from "@/lib/database";

async function getGlobalStats() {
  const database = getDatabaseClient();

  // Nombre total de tournois
  const [tournamentsCount] = await database<{ count: string }[]>`
    select count(*)::text as count
    from tournaments
  `;

  // Nombre total de matchs completed
  const [matchesCount] = await database<{ count: string }[]>`
    select count(*)::text as count
    from matches
    where status = 'completed'
  `;

  // Nombre de joueurs ayant participé à au moins un tournoi
  const [playersCount] = await database<{ count: string }[]>`
    select count(distinct player_id)::text as count
    from participations
  `;

  // Nombre total de sets joués
  const [setsCount] = await database<{ count: string }[]>`
    select count(*)::text as count
    from sets
  `;

  return {
    tournaments: parseInt(tournamentsCount?.count || "0"),
    matches: parseInt(matchesCount?.count || "0"),
    players: parseInt(playersCount?.count || "0"),
    sets: parseInt(setsCount?.count || "0"),
  };
}

async function getUpcomingTournaments() {
  const database = getDatabaseClient();

  const tournaments = await database<
    {
      id: string;
      name: string;
      start_date: string;
      end_date: string | null;
      status: string;
      location: string | null;
      max_participants: number | null;
      current_participants: string; // count
    }[]
  >`
    select
      t.id,
      t.name,
      t.start_date,
      t.end_date,
      t.status,
      t.location,
      t.max_participants,
      count(p.id)::text as current_participants
    from tournaments t
    left join participations p on p.tournament_id = t.id
    where t.status in ('upcoming', 'registration', 'ongoing')
    group by t.id, t.name, t.start_date, t.end_date, t.status, t.location, t.max_participants
    order by t.start_date asc
    limit 5
  `;

  return tournaments.map(t => ({
    ...t,
    current_participants: parseInt(t.current_participants),
  }));
}

export default async function HomePage() {
  const stats = await getGlobalStats();
  const upcomingTournaments = await getUpcomingTournaments();

  return (
    <div className="min-h-screen bg-[#1E1E2E]">
      <HomeHero stats={stats} />

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Colonne principale */}
          <main className="space-y-8">
            {/* KPIs à implémenter plus tard */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
              KPIs à venir : Podium, Classements, Match le plus serré, etc.
            </div>
          </main>

          {/* Sidebar avec Prochains Tournois */}
          <aside className="space-y-6">
            <UpcomingTournaments tournaments={upcomingTournaments} />
            <ContactModule />
          </aside>
        </div>
      </div>
    </div>
  );
}
```

### 2. Composant HomeHero avec Stats Réelles

#### src/components/home/HomeHero.tsx
```tsx
type Stats = {
  tournaments: number;
  matches: number;
  players: number;
  sets: number;
};

type HomeHeroProps = {
  stats: Stats;
};

export function HomeHero({ stats }: HomeHeroProps) {
  return (
    <section className="relative h-[220px] w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <div className="h-full w-full bg-gradient-to-br from-orange-500/20 to-violet-500/20" />
      </div>

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-[#1E1E2E]" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-full flex items-center justify-center">
        <div className="grid grid-cols-4 gap-8 w-full max-w-4xl">
          <StatCard
            value={stats.tournaments}
            label="Tournois"
            icon="🏆"
          />
          <StatCard
            value={stats.matches}
            label="Matchs joués"
            icon="🎾"
          />
          <StatCard
            value={stats.players}
            label="Joueurs actifs"
            icon="👥"
          />
          <StatCard
            value={stats.sets}
            label="Sets"
            icon="📊"
          />
        </div>
      </div>
    </section>
  );
}

function StatCard({ value, label, icon }: { value: number; label: string; icon: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-4xl font-bold text-white mb-1">
        {value.toLocaleString('fr-FR')}
      </div>
      <div className="text-sm text-white/60">{label}</div>
    </div>
  );
}
```

### 3. Composant Prochains Tournois Amélioré

#### src/components/home/UpcomingTournaments.tsx
```tsx
import Link from "next/link";
import { Calendar, MapPin, Users, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Tournament = {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  status: string;
  location: string | null;
  max_participants: number | null;
  current_participants: number;
};

type UpcomingTournamentsProps = {
  tournaments: Tournament[];
};

const statusLabels: Record<string, { label: string; color: string }> = {
  registration: { label: "Inscriptions ouvertes", color: "text-green-400" },
  upcoming: { label: "À venir", color: "text-yellow-400" },
  ongoing: { label: "En cours", color: "text-orange-400" },
};

export function UpcomingTournaments({ tournaments }: UpcomingTournamentsProps) {
  if (tournaments.length === 0) {
    return (
      <section className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-orange-500" />
          Prochains Tournois
        </h2>
        <p className="text-sm text-white/60 text-center py-8">
          Aucun tournoi à venir pour le moment.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-violet-500/10 p-6 shadow-lg">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Calendar className="w-6 h-6 text-orange-500" />
        Prochains Tournois
      </h2>

      <div className="space-y-4">
        {tournaments.map((tournament) => {
          const statusInfo = statusLabels[tournament.status] || {
            label: tournament.status,
            color: "text-white/60",
          };

          const formattedDate = format(new Date(tournament.start_date), "d MMMM yyyy", {
            locale: fr,
          });

          const isFull =
            tournament.max_participants !== null &&
            tournament.current_participants >= tournament.max_participants;

          return (
            <div
              key={tournament.id}
              className="rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"
            >
              {/* Header */}
              <div className="mb-3">
                <h3 className="text-base font-bold text-white mb-1">
                  {tournament.name}
                </h3>
                <p className={`text-xs font-medium ${statusInfo.color}`}>
                  {statusInfo.label}
                </p>
              </div>

              {/* Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <Calendar className="w-3.5 h-3.5 text-orange-500" />
                  <span>{formattedDate}</span>
                </div>

                {tournament.location && (
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <MapPin className="w-3.5 h-3.5 text-orange-500" />
                    <span>{tournament.location}</span>
                  </div>
                )}

                {tournament.max_participants && (
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <Users className="w-3.5 h-3.5 text-orange-500" />
                    <span>
                      {tournament.current_participants} / {tournament.max_participants} joueurs
                    </span>
                    {isFull && (
                      <span className="ml-auto text-red-400 font-medium">Complet</span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {tournament.status === "registration" && !isFull && (
                  <Link
                    href={`/tournaments/${tournament.id}/register`}
                    className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-medium text-white text-center hover:from-orange-600 hover:to-orange-700 transition-all"
                  >
                    S'inscrire
                  </Link>
                )}

                <Link
                  href={`/tournaments/${tournament.id}`}
                  className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white text-center hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  Accéder
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <Link
          href="/tournaments"
          className="flex items-center justify-center gap-2 text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors"
        >
          Voir tous les tournois
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
```

### 4. Module "On se rejoint ?"

#### src/components/home/ContactModule.tsx
```tsx
import { MessageCircle, Mail } from "lucide-react";

export function ContactModule() {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-violet-500" />
        On se rejoint ?
      </h2>

      <p className="text-sm text-white/70 mb-4">
        Envie de participer aux prochains tournois ? Rejoignez la communauté !
      </p>

      <a
        href="mailto:contact@tournoi-frérots.com"
        className="flex items-center justify-center gap-2 w-full rounded-lg bg-gradient-to-r from-violet-500 to-violet-600 px-4 py-3 text-sm font-medium text-white hover:from-violet-600 hover:to-violet-700 transition-all"
      >
        <Mail className="w-4 h-4" />
        Nous contacter
      </a>
    </section>
  );
}
```

### 5. Page Démo avec Données Fictives

#### src/app/demo/page.tsx
```tsx
import { HomeHero } from "@/components/home/HomeHero";
import { UpcomingTournaments } from "@/components/home/UpcomingTournaments";
import { ContactModule } from "@/components/home/ContactModule";

// Données fictives pour la démo
const mockStats = {
  tournaments: 24,
  matches: 486,
  players: 64,
  sets: 1458,
};

const mockTournaments = [
  {
    id: "demo-1",
    name: "Tournoi des Frérots - Édition Été",
    start_date: "2026-06-15",
    end_date: "2026-06-16",
    status: "registration",
    location: "Paris Padel Club",
    max_participants: 32,
    current_participants: 18,
  },
  {
    id: "demo-2",
    name: "Open de Printemps",
    start_date: "2026-05-10",
    end_date: null,
    status: "upcoming",
    location: "Lyon Sport Arena",
    max_participants: 24,
    current_participants: 24,
  },
  {
    id: "demo-3",
    name: "Tournoi Amical",
    start_date: "2026-04-20",
    end_date: "2026-04-20",
    status: "ongoing",
    location: "Bordeaux Padel Center",
    max_participants: 16,
    current_participants: 16,
  },
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[#1E1E2E]">
      {/* Banner Demo */}
      <div className="bg-gradient-to-r from-violet-500/20 to-orange-500/20 border-b border-white/10">
        <div className="container mx-auto px-4 py-3">
          <p className="text-center text-sm font-medium text-white">
            🎨 Page de démo avec données fictives
            {" • "}
            <a href="/" className="underline hover:text-orange-400 transition-colors">
              Voir la vraie page
            </a>
          </p>
        </div>
      </div>

      <HomeHero stats={mockStats} />

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Colonne principale */}
          <main className="space-y-8">
            {/* Placeholder pour les futurs KPIs */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">
                KPIs à venir
              </h2>
              <p className="text-white/60">
                Podium des champions, classements des paires, joueurs, statistiques des matchs, etc.
              </p>
            </div>

            {/* Exemple de KPI Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-500/5 p-6">
                <div className="text-orange-500 text-3xl mb-2">🥇</div>
                <h3 className="text-lg font-bold text-white mb-1">Champion</h3>
                <p className="text-2xl font-bold text-white mb-1">Équipe Alpha</p>
                <p className="text-sm text-white/60">5 victoires</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <div className="text-white/60 text-3xl mb-2">🥈</div>
                <h3 className="text-lg font-bold text-white mb-1">2ème place</h3>
                <p className="text-2xl font-bold text-white mb-1">Équipe Beta</p>
                <p className="text-sm text-white/60">4 victoires</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <div className="text-white/60 text-3xl mb-2">🥉</div>
                <h3 className="text-lg font-bold text-white mb-1">3ème place</h3>
                <p className="text-2xl font-bold text-white mb-1">Équipe Gamma</p>
                <p className="text-sm text-white/60">3 victoires</p>
              </div>
            </div>
          </main>

          {/* Sidebar */}
          <aside className="space-y-6">
            <UpcomingTournaments tournaments={mockTournaments} />
            <ContactModule />
          </aside>
        </div>
      </div>
    </div>
  );
}
```

### 6. Amélioration du Layout Grid

La sidebar est maintenant **360px** (au lieu de 300px) pour mieux afficher les tournois avec leurs boutons.

```tsx
// Layout 2 colonnes avec sidebar plus large
<div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
  <main className="space-y-8">
    {/* Contenu principal */}
  </main>

  <aside className="space-y-6">
    {/* Sidebar */}
  </aside>
</div>
```

### 7. Installation de date-fns (si pas déjà installé)

```bash
npm install date-fns
```

### 8. Liens de Navigation

#### Modifier src/app/tournaments/[id]/page.tsx (si nécessaire)
S'assurer que la page d'un tournoi individuel redirige vers `/tournoi/en-cours` si le tournoi est en cours.

Ou créer un middleware/redirection :

```typescript
// Dans le composant ou une fonction
if (tournament.status === 'ongoing') {
  redirect(`/tournoi/en-cours?tournament=${tournament.id}`);
}
```

### 9. Structure Finale des Fichiers

```
src/
  app/
    page.tsx (home réelle avec vraies données)
    demo/
      page.tsx (home avec données fictives)
  components/
    home/
      HomeHero.tsx (stats hero)
      UpcomingTournaments.tsx (bloc prochains tournois)
      ContactModule.tsx (module contact)
```

## Checklist de Validation

### Tests Page Réelle (/)
- [ ] Stats hero affichent les vraies données de la DB
- [ ] Le nombre de tournois est correct
- [ ] Le nombre de matchs completed est correct
- [ ] Le nombre de joueurs actifs est correct
- [ ] Le nombre de sets est correct
- [ ] Le bloc "Prochains Tournois" affiche les tournois avec status upcoming/registration/ongoing
- [ ] Les tournois sont triés par date (le plus proche en premier)
- [ ] Le statut de chaque tournoi est affiché correctement
- [ ] Le nombre de participants est affiché
- [ ] Les tournois complets affichent "Complet"
- [ ] Le bouton "S'inscrire" apparaît uniquement si status = registration et pas complet
- [ ] Le bouton "S'inscrire" mène vers `/tournaments/[id]/register`
- [ ] Le bouton "Accéder" mène vers `/tournaments/[id]`
- [ ] Le module "On se rejoint ?" est affiché
- [ ] Le design respecte la charte Proposition 3

### Tests Page Démo (/demo)
- [ ] La page /demo existe et fonctionne
- [ ] Le banner "Page de démo" est affiché
- [ ] Les stats affichent les données fictives (24, 486, 64, 1458)
- [ ] Les 3 tournois fictifs sont affichés
- [ ] Les exemples de KPI cards sont affichés
- [ ] Le design est identique à la home réelle
- [ ] Le lien "Voir la vraie page" mène vers /

### Tests Responsive
- [ ] Sur desktop (>1024px) : layout 2 colonnes
- [ ] Sur tablet/mobile (<1024px) : layout 1 colonne
- [ ] Le hero reste lisible sur toutes les tailles
- [ ] Les boutons des tournois sont cliquables sur mobile
- [ ] Les stats du hero s'adaptent bien

## Optimisations Performance

### Caching
```typescript
// src/app/page.tsx
export const revalidate = 300; // Revalider toutes les 5 minutes

// Ou pour des requêtes individuelles
import { unstable_cache } from 'next/cache';

const getCachedStats = unstable_cache(
  async () => getGlobalStats(),
  ['global-stats'],
  { revalidate: 300 }
);
```

### Indexes Database
```sql
-- Optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON tournaments(start_date);
CREATE INDEX IF NOT EXISTS idx_participations_tournament ON participations(tournament_id);
```

## Points d'Attention

1. **Nombre de joueurs actifs** : La requête compte les joueurs avec au moins une participation. Si vous voulez uniquement les joueurs "actifs" sur les 6 derniers mois par exemple, ajuster la requête.

2. **Statuts des tournois** : S'assurer que les statuts en DB sont bien 'upcoming', 'registration', 'ongoing', 'completed', etc.

3. **Lien "Accéder"** : Actuellement le bouton mène vers `/tournaments/[id]`. Si vous voulez qu'il mène directement vers `/tournoi/en-cours`, modifier :
   ```tsx
   href={`/tournoi/en-cours?tournament=${tournament.id}`}
   ```

4. **Page d'inscription** : S'assurer que `/tournaments/[id]/register` existe et fonctionne.

5. **Formatage des nombres** : Les stats utilisent `toLocaleString('fr-FR')` pour formater avec des espaces (1 458 au lieu de 1458).

6. **Dates** : Utilisation de `date-fns` avec locale française pour formater les dates.

## Améliorations Futures (Optionnelles)

- [ ] Ajouter une image de fond réelle dans le Hero (à la place du gradient)
- [ ] Animations d'entrée pour les stats (compteur qui monte)
- [ ] Filtres sur les tournois (par statut, par date)
- [ ] Pagination si >5 tournois à venir
- [ ] Indicateur de places restantes (jauge visuelle)
- [ ] Notifications push pour les nouveaux tournois
- [ ] Export iCal pour ajouter les tournois au calendrier
