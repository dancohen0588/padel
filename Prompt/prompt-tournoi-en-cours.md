# Développement de la page "Tournoi en cours" (/tournoi/en-cours)

## 🎯 Objectif
Créer une page publique pour suivre les tournois en cours avec deux modes d'affichage selon l'état du tournoi.

## 📋 Contexte technique

### Stack & Architecture
- **Framework** : Next.js 14+ (App Router)
- **Langage** : TypeScript
- **Styling** : Tailwind CSS
- **Charte graphique** : Urban Sport
  - Orange : `#ff6b35` → `#ff8c42` (principal)
  - Vert : `#4CAF50` (succès)
  - Violet : `#9D7AFA` (accent)
  - Jaune : `#FFDA77` (attente)
  - Background : `#1E1E2E`

### Fichiers de référence à consulter
1. `/src/app/tournaments/[slug]/admin/page.tsx` - Page admin avec onglets (déjà implémentée avec le nouveau design)
2. `/src/components/tournaments/admin/TournamentConfigAdmin.tsx` - Affichage des équipes
3. `/src/components/tournaments/admin/MatchesAdminTab.tsx` - Affichage des matchs et classements
4. `/src/lib/queries.ts` - Fonctions de récupération des données
5. `/src/lib/types.ts` - Types TypeScript

## 📝 Spécifications détaillées

### 1. Header de la page

#### Modification du header
- **Emplacement** : `/src/components/layout/header.tsx`
- **Action** : Renommer le lien/texte pour afficher "Tournoi" au lieu du texte actuel

#### Sélecteur de tournoi
- **Position** : En haut de la page, juste après le header
- **Composant** : Liste déroulante (dropdown/select)
- **Données affichées** :
  - Nom du tournoi
  - Date du tournoi
  - Statut (badge visuel)
- **Filtrage** : Afficher uniquement les tournois avec `status === "published"`
- **Tri** : Par date décroissante (les plus récents en premier)
- **État par défaut** : Sélectionner automatiquement le tournoi le plus récent

### 2. Logique conditionnelle d'affichage

#### Détermination de l'état du tournoi
```typescript
// Pseudo-code
const tournamentStatus = determineTournamentStatus(tournament);

function determineTournamentStatus(tournament) {
  const matches = getAllMatchesForTournament(tournament.id);
  const hasStarted = matches.some(match => match.sets.length > 0);

  return hasStarted ? 'started' : 'not-started';
}
```

#### Affichage selon l'état

**Cas 1 : Tournoi NON démarré** (`hasStarted === false`)
- Aucun match n'a de scores enregistrés
- Afficher : Liste des équipes/paires inscrites

**Cas 2 : Tournoi démarré** (`hasStarted === true`)
- Au moins un match a des scores
- Afficher : Matchs et classements par poule

### 3. Mode "Tournoi non démarré"

#### Design
- S'inspirer de l'onglet "Équipes" dans `/tournaments/<slug>/admin`
- **Différences avec l'admin** :
  - ❌ Pas de drag & drop
  - ❌ Pas de boutons d'édition
  - ❌ Pas de possibilité de créer/supprimer des équipes
  - ✅ Affichage en lecture seule
  - ✅ Design similaire (cards avec avatars, noms des joueurs)

#### Structure de l'affichage
```
┌─────────────────────────────────────────┐
│  [Dropdown: Sélection du tournoi]      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  📊 Équipes inscrites                   │
│  12 joueurs · 6 équipes                 │
└─────────────────────────────────────────┘

┌────────────┐ ┌────────────┐ ┌────────────┐
│ Équipe 1   │ │ Équipe 2   │ │ Équipe 3   │
│ ━━━━━━━━━━ │ │ ━━━━━━━━━━ │ │ ━━━━━━━━━━ │
│ 👤 Joueur A│ │ 👤 Joueur C│ │ 👤 Joueur E│
│ 👤 Joueur B│ │ 👤 Joueur D│ │ 👤 Joueur F│
└────────────┘ └────────────┘ └────────────┘
```

#### Données à afficher
- Nom de l'équipe
- Noms des 2 joueurs (prénom + nom)
- Poule assignée (si disponible)
- Badge "Complète" si 2 joueurs

### 4. Mode "Tournoi démarré"

#### Design
- S'inspirer de l'onglet "Matchs & Classements" dans `/tournaments/<slug>/admin`
- **Spécificités** :
  - ✅ Affichage des classements par poule (lecture seule)
  - ✅ Liste des matchs avec scores
  - ✅ **Possibilité d'éditer les scores** (bouton "Modifier le score")
  - ✅ Modal/formulaire pour saisir les scores des sets

#### Structure de l'affichage
```
┌─────────────────────────────────────────┐
│  [Dropdown: Sélection du tournoi]      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  [Onglets: Poule A | Poule B | Poule C]│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  📊 Classement - Poule A                │
│  ┌────┬────────┬───┬───┬───┬────────┐  │
│  │ #  │ Équipe │ J │ G │ P │ +/-    │  │
│  ├────┼────────┼───┼───┼───┼────────┤  │
│  │ 1  │ Team A │ 3 │ 3 │ 0 │ +12    │  │
│  │ 2  │ Team B │ 3 │ 2 │ 1 │ +5     │  │
│  └────┴────────┴───┴───┴───┴────────┘  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ⚔️ Matchs                              │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Match 1 • 8 Fév 14:00           │   │
│  │ Team A  [3]  vs  [1]  Team B    │   │
│  │ Sets: 6-3, 7-5, 5-7, 6-4        │   │
│  │              [Modifier le score]│   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

#### Fonctionnalités d'édition des scores

**Bouton "Modifier le score"**
- Visible sur chaque match
- Ouvre un modal/formulaire

**Modal de saisie des scores**
- Champs pour chaque set (maximum 5 sets)
- Validation des scores :
  - Set gagnant : 6 jeux minimum avec 2 jeux d'écart
  - Si 5-5 : aller jusqu'à 7-5
  - Si 6-6 : aller jusqu'à 7-6
- Calcul automatique du vainqueur du match
- Boutons : "Enregistrer" / "Annuler"

**Actions serveur**
- Créer une action serveur pour mettre à jour les scores
- Chemin suggéré : `/src/app/actions/matches.ts`
- Fonctions :
  - `updateMatchScoresAction(matchId, sets, adminToken?)`
  - Vérifier si l'utilisateur a le droit de modifier (token admin ou pas de sécurité pour l'instant)

### 5. Composants à créer/modifier

#### Nouveau fichier : `/src/app/tournoi/en-cours/page.tsx`
```typescript
// Structure suggérée
export default async function TournoiEnCoursPage() {
  // 1. Récupérer tous les tournois publiés
  const tournaments = await getPublishedTournaments();

  // 2. Sélectionner le tournoi par défaut (le plus récent)
  const defaultTournament = tournaments[0];

  // 3. Composant client pour la sélection et l'affichage
  return (
    <div className="min-h-screen bg-[#1E1E2E] text-white">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <TournamentSelector tournaments={tournaments} />
        <TournamentDisplay tournamentId={selectedId} />
      </main>
      <Footer />
    </div>
  );
}
```

#### Composant client : `TournamentSelector`
- Props : `{ tournaments: Tournament[] }`
- État local pour le tournoi sélectionné
- Dropdown stylisé avec la charte graphique

#### Composant : `TournamentDisplay`
- Props : `{ tournamentId: string }`
- Détermine l'état du tournoi (démarré/non démarré)
- Affiche le bon composant selon l'état

#### Composant : `TeamsReadOnlyView`
- Affichage des équipes en lecture seule
- Design similaire à `TournamentConfigAdmin` mais sans interactions

#### Composant : `MatchesAndStandingsView`
- Affichage des matchs et classements
- Réutiliser/adapter `MatchesAdminTab`
- Ajouter la fonctionnalité d'édition des scores

#### Composant : `MatchScoreModal`
- Modal pour éditer les scores
- Formulaire avec validation
- Appel à l'action serveur

### 6. Queries à créer/adapter

#### Dans `/src/lib/queries.ts`
```typescript
// Nouvelles fonctions nécessaires
export async function getPublishedTournaments(): Promise<Tournament[]>
export async function getTournamentWithAllData(tournamentId: string)
export async function checkIfTournamentStarted(tournamentId: string): Promise<boolean>
```

### 7. Actions serveur

#### Dans `/src/app/actions/matches.ts` (à créer)
```typescript
"use server";

export async function updateMatchScoresAction(
  matchId: string,
  sets: Array<{ team1_score: number; team2_score: number }>,
  adminToken?: string
): Promise<{ success: boolean; error?: string }>
```

### 8. Styles et design

#### Respecter la charte graphique Urban Sport
- Utiliser les classes Tailwind cohérentes avec `/tournaments/<slug>/admin/page.tsx`
- Background : `bg-[#1E1E2E]`
- Cards : `bg-white/5`, `border-white/10`
- Onglets actifs : `bg-gradient-to-br from-orange-400 to-orange-500`
- Badges : utiliser les couleurs de la charte (vert, orange, jaune)

#### Responsive
- Design mobile-first
- Grid/Flex pour l'adaptation
- Dropdown accessible sur mobile

### 9. Sécurité et validation

#### Édition des scores
- Pour l'instant : permettre l'édition sans authentification (à sécuriser plus tard si nécessaire)
- Validation côté serveur des scores (règles du padel)
- Empêcher l'édition si le tournoi est archivé

#### Validation des données
- Vérifier que le tournoi existe
- Vérifier que le match existe
- Valider les scores selon les règles du padel

### 10. Gestion des erreurs

#### Cas d'erreur à gérer
- Aucun tournoi publié disponible → Message "Aucun tournoi en cours"
- Tournoi non trouvé → Redirection ou message d'erreur
- Erreur lors de la mise à jour des scores → Toast d'erreur
- Problème de connexion à la DB → Message générique

## 🎨 Références visuelles

Les fichiers HTML de référence pour le design sont dans :
- `/mnt/padel/menu-admin-final.html` - Design du header et navigation
- `/mnt/padel/refonte-tab-equipes.html` - Design des équipes
- `/mnt/padel/proposition-3-hybride.html` - Design des matchs et classements

## ✅ Checklist de développement

### Phase 1 : Structure de base
- [ ] Créer `/src/app/tournoi/en-cours/page.tsx`
- [ ] Modifier le header pour afficher "Tournoi"
- [ ] Créer le composant `TournamentSelector`
- [ ] Ajouter les queries pour récupérer les tournois publiés

### Phase 2 : Mode "Non démarré"
- [ ] Créer `TeamsReadOnlyView`
- [ ] Implémenter l'affichage des équipes
- [ ] Ajouter la détection de l'état du tournoi

### Phase 3 : Mode "Démarré"
- [ ] Créer/adapter `MatchesAndStandingsView`
- [ ] Afficher les classements par poule
- [ ] Afficher les matchs avec scores

### Phase 4 : Édition des scores
- [ ] Créer `MatchScoreModal`
- [ ] Implémenter le formulaire de saisie
- [ ] Créer l'action serveur `updateMatchScoresAction`
- [ ] Ajouter la validation des scores

### Phase 5 : Polish
- [ ] Tests de responsive
- [ ] Gestion des erreurs
- [ ] Messages de feedback utilisateur
- [ ] Animations et transitions

## 📌 Notes importantes

1. **Réutilisation du code** : Maximiser la réutilisation des composants existants de la page admin
2. **Cohérence visuelle** : Suivre strictement la charte graphique déjà implémentée
3. **Performance** : Utiliser les Server Components quand possible
4. **Accessibilité** : Respecter les normes a11y (labels, contraste, navigation clavier)
5. **TypeScript** : Typer toutes les props et fonctions
6. **Validation** : Valider les scores côté serveur selon les règles du padel

## 🚀 Commande pour démarrer

```bash
# Se positionner dans le projet
cd /sessions/ecstatic-vigilant-ramanujan/mnt/padel

# Installer les dépendances si nécessaire
npm install

# Lancer le serveur de développement
npm run dev

# Accéder à la page
# http://localhost:3000/tournoi/en-cours
```

---

**Objectif final** : Une page publique élégante et fonctionnelle qui permet de suivre les tournois en cours, avec possibilité d'éditer les scores, tout en respectant la charte graphique Urban Sport déjà implémentée.
