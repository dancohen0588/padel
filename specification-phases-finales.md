# Spécification Fonctionnelle - Phases Finales du Tournoi

## 📚 Analyse des compétitions sportives de référence

### 1. Champions League (UEFA)
- **Système** : Seeding basé sur le classement de la phase de poules
- **Principe** : Les équipes les mieux classées (positions 1-8) affrontent les moins bien classées (positions 9-24)
- **Règle clé** : Protection des têtes de série jusqu'aux phases avancées
- **Source** : [UEFA Champions League Format 2025/26](https://www.uefa.com/uefachampionsleague/news/0296-1d21e9bdf7e4-808a7511165c-1000--2025-26-champions-league-teams-format-dates-draws-final/)

### 2. Coupe du Monde FIFA 2026
- **Système** : "Tennis-style seeding" - Les 4 meilleures équipes ne peuvent se rencontrer qu'en demi-finales
- **Principe** : Bracket engineering pour garantir un équilibre compétitif
- **Règle clé** : Les meilleurs de chaque poule sont placés dans des brackets opposés
- **Source** : [FIFA World Cup 2026 Knockout Stage](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/knockout-stage-match-schedule-bracket)

### 3. Tennis Grand Slam
- **Système** : 32 têtes de série sur 128 participants (25% de têtes de série)
- **Principe** : Distribution stratégique des têtes de série dans le tableau
- **Règle clé** : Les têtes de série ne se rencontrent qu'à partir du 3ème tour
- **Source** : [How Grand Slam Tournament Draws Work](https://ausopen.com/articles/news/how-grand-slam-tournament-draws-are-made)

---

## 🎯 Spécifications pour le tournoi de padel

### 1. Contexte et objectifs

#### Objectifs principaux
1. **Équité sportive** : Les meilleures équipes doivent avoir un parcours valorisant leur performance en poules
2. **Spectacle** : Éviter les chocs prématurés entre favoris
3. **Diversité** : Garantir des confrontations entre équipes de poules différentes
4. **Clarté** : Système compréhensible et transparent pour tous les participants

### 2. Règles de qualification

#### Nombre d'équipes qualifiées par poule
Le nombre d'équipes qualifiées dépend de la configuration du tournoi :

| Nombre total d'équipes | Nombre de poules | Qualifiés par poule | Total qualifiés | Phase de départ |
|------------------------|------------------|---------------------|-----------------|-----------------|
| 16 équipes | 4 poules | 2 premières | 8 équipes | Quarts de finale |
| 16 équipes | 4 poules | Top 4 au total | 4 équipes | Demi-finales |
| 24 équipes | 6 poules | Top 8 au total | 8 équipes | Quarts de finale |
| 32 équipes | 8 poules | 2 premières | 16 équipes | 8èmes de finale |
| 32 équipes | 8 poules | 4 premières | 32 équipes | 16èmes de finale |

#### Critères de départage en cas d'égalité
En cas d'égalité de points dans une poule, l'ordre est déterminé par :
1. **Goal average** (différence jeux gagnés - jeux perdus)
2. **Matchs gagnés** (en nombre absolu)
3. **Confrontation directe** (si applicable)
4. **Jeux gagnés** (en nombre absolu)

### 3. Système de seeding (têtes de série)

#### Principe du seeding
Toutes les équipes qualifiées reçoivent un **classement global** (seed) basé sur leur performance en poules.

#### Calcul du classement global

**Critères de classement par ordre de priorité :**
1. **Rang dans la poule** (1er > 2ème > 3ème)
2. **Goal average** de la poule
3. **Nombre de victoires** en phase de poules
4. **Jeux gagnés** (total)

**Exemple avec 8 poules et 16 qualifiés (2 par poule) :**
- Seeds 1-8 : Les 1ers de chaque poule (classés par goal average)
- Seeds 9-16 : Les 2èmes de chaque poule (classés par goal average)

**Exemple avec 4 poules et 8 qualifiés (2 par poule) :**
- Seeds 1-4 : Les 1ers de chaque poule
- Seeds 5-8 : Les 2èmes de chaque poule

### 4. Construction du tableau à élimination directe

#### 4.1 Principe général d'appariement

**Règle fondamentale** : Seed #1 rencontre le dernier qualifié, Seed #2 rencontre l'avant-dernier, etc.

```
Seed #1  vs  Seed #16
Seed #8  vs  Seed #9
Seed #4  vs  Seed #13
Seed #5  vs  Seed #12
Seed #2  vs  Seed #15
Seed #7  vs  Seed #10
Seed #3  vs  Seed #14
Seed #6  vs  Seed #11
```

#### 4.2 Contrainte de séparation des poules

**Règle #1** : Au premier tour des phases finales, une équipe ne peut pas rencontrer une équipe de sa propre poule.

**Application** :
- Si le Seed #1 (Poule A) devrait normalement affronter le Seed #16 (Poule A), on effectue un **swap** avec le Seed #15 ou #17 (selon disponibilité) d'une autre poule
- Le swap doit respecter au maximum l'équilibre du seeding (permuter avec le seed le plus proche possible)

#### 4.3 Protection des têtes de série

**Principe inspiré du tennis :**
- Le quart supérieur du tableau (seeds 1-4) ne peut rencontrer le quart suivant (seeds 5-8) qu'en demi-finale
- Les seeds 1 et 2 sont placés aux extrémités opposées du tableau et ne peuvent se rencontrer qu'en finale

#### 4.4 Exemples de tableaux selon le nombre d'équipes

##### Tableau pour 32 équipes (16èmes de finale)

```
┌─────────────────────────────────────────────────────┐
│              PARTIE HAUTE (Seeds 1-16)              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  16èmes          8èmes        Quarts      Demi      │
│                                                     │
│  S1 ────┐                                          │
│  S32 ───┴────┐                                     │
│              │                                     │
│  S16 ────┐   ├────┐                               │
│  S17 ───┴────┘    │                               │
│                   ├────┐                          │
│  S8  ────┐        │    │                          │
│  S25 ───┴────┐    │    │                          │
│              ├────┘    │                          │
│  S9  ────┐   │         │                          │
│  S24 ───┴────┘         ├────┐                     │
│                        │    │                     │
│  S4  ────┐             │    │                     │
│  S29 ───┴────┐         │    │                     │
│              │         │    │                     │
│  S13 ────┐   ├────┐    │    │                     │
│  S20 ───┴────┘    │    │    │                     │
│                   ├────┘    │                     │
│  S5  ────┐        │         │                     │
│  S28 ───┴────┐    │         │                     │
│              ├────┘         │                     │
│  S12 ────┐   │              ├────┐                │
│  S21 ───┴────┘              │    │    FINALE      │
│                             │    │       │        │
├─────────────────────────────┴────┴───────┼────────┤
│              PARTIE BASSE (Seeds 2-17)   │        │
├──────────────────────────────────────────┘        │
│                                                    │
│  S2  ────┐                                         │
│  S31 ───┴────┐                                    │
│              │                                    │
│  S15 ────┐   ├────┐                               │
│  S18 ───┴────┘    │                               │
│                   ├────┐                          │
│  S7  ────┐        │    │                          │
│  S26 ───┴────┐    │    │                          │
│              ├────┘    │                          │
│  S10 ────┐   │         │                          │
│  S23 ───┴────┘         ├────┐                     │
│                        │    │                     │
│  S3  ────┐             │    │                     │
│  S30 ───┴────┐         │    │                     │
│              │         │    │                     │
│  S14 ────┐   ├────┐    │    │                     │
│  S19 ───┴────┘    │    │    │                     │
│                   ├────┘    │                     │
│  S6  ────┐        │         │                     │
│  S27 ───┴────┐    │         │                     │
│              ├────┘         │                     │
│  S11 ────┐   │              │                     │
│  S22 ───┴────┘              │                     │
│                             │                     │
└─────────────────────────────┴─────────────────────┘
```

##### Tableau pour 16 équipes (8èmes de finale)

```
┌───────────────────────────────────────┐
│      PARTIE HAUTE (Seeds 1-8)        │
├───────────────────────────────────────┤
│                                       │
│  8èmes      Quarts    Demi    Finale │
│                                       │
│  S1 ────┐                             │
│  S16 ───┴────┐                        │
│              ├────┐                   │
│  S8 ────┐    │    │                   │
│  S9 ────┴────┘    │                   │
│                   ├────┐              │
│  S4 ────┐         │    │              │
│  S13 ───┴────┐    │    │              │
│              ├────┘    ├────┐         │
│  S5 ────┐    │         │    │         │
│  S12 ───┴────┘         │    │         │
│                        │    │    F    │
├────────────────────────┴────┴────┼────┤
│      PARTIE BASSE (Seeds 2-7)    │    │
├──────────────────────────────────┘    │
│                                       │
│  S2 ────┐                             │
│  S15 ───┴────┐                        │
│              ├────┐                   │
│  S7 ────┐    │    │                   │
│  S10 ───┴────┘    │                   │
│                   ├────┐              │
│  S3 ────┐         │    │              │
│  S14 ───┴────┐    │    │              │
│              ├────┘    │              │
│  S6 ────┐    │         │              │
│  S11 ───┴────┘         │              │
│                        │              │
└────────────────────────┴──────────────┘
```

##### Tableau pour 8 équipes (Quarts de finale)

```
┌─────────────────────────────────┐
│    PARTIE HAUTE (Seeds 1-4)    │
├─────────────────────────────────┤
│                                 │
│  Quarts    Demi      Finale     │
│                                 │
│  S1 ────┐                       │
│  S8 ────┴────┐                  │
│              ├────┐             │
│  S4 ────┐    │    │             │
│  S5 ────┴────┘    │             │
│                   │    F        │
├───────────────────┴────┼────────┤
│    PARTIE BASSE        │        │
├────────────────────────┘        │
│                                 │
│  S2 ────┐                       │
│  S7 ────┴────┐                  │
│              ├────┐             │
│  S3 ────┐    │    │             │
│  S6 ────┴────┘    │             │
│                   │             │
└───────────────────┴─────────────┘
```

##### Tableau pour 4 équipes (Demi-finales directes)

```
┌─────────────────────────┐
│  Demi-finales  Finale   │
├─────────────────────────┤
│                         │
│  S1 ────┐               │
│  S4 ────┴────┐          │
│              │    F     │
│              ├────┼─────┤
│              │    │     │
│  S2 ────┐    │          │
│  S3 ────┴────┘          │
│                         │
└─────────────────────────┘
```

### 5. Algorithme de génération du tableau

#### Étape 1 : Qualification et classement
```typescript
// Récupérer toutes les équipes qualifiées
const qualifiedTeams = getQualifiedTeams(pools);

// Calculer le classement global (seeding)
const rankedTeams = rankTeamsByPerformance(qualifiedTeams);
// Résultat : Array de {teamId, seed, poolId, goalAverage, wins}
```

#### Étape 2 : Génération des appariements de base
```typescript
// Générer les matchs selon le principe seed #1 vs dernier, etc.
function generateBasicBracket(rankedTeams: RankedTeam[]): Match[] {
  const n = rankedTeams.length;
  const matches: Match[] = [];

  for (let i = 0; i < n / 2; i++) {
    matches.push({
      team1: rankedTeams[i],           // Seed #1, #2, #3...
      team2: rankedTeams[n - 1 - i],   // Seed #16, #15, #14...
      round: determineRound(n)
    });
  }

  return matches;
}
```

#### Étape 3 : Application de la contrainte de poule
```typescript
function avoidSamePoolInFirstRound(matches: Match[]): Match[] {
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];

    // Si les deux équipes viennent de la même poule
    if (match.team1.poolId === match.team2.poolId) {
      // Chercher un swap possible avec un autre match
      const swapIndex = findValidSwap(matches, i);

      if (swapIndex !== -1) {
        // Échanger team2 avec le team2 d'un autre match
        [matches[i].team2, matches[swapIndex].team2] =
        [matches[swapIndex].team2, matches[i].team2];
      }
    }
  }

  return matches;
}

function findValidSwap(matches: Match[], currentIndex: number): number {
  const currentMatch = matches[currentIndex];

  // Chercher un autre match où on peut échanger les team2
  for (let j = 0; j < matches.length; j++) {
    if (j === currentIndex) continue;

    const otherMatch = matches[j];

    // Vérifier que l'échange résout le problème sans en créer un nouveau
    if (currentMatch.team1.poolId !== otherMatch.team2.poolId &&
        otherMatch.team1.poolId !== currentMatch.team2.poolId) {
      return j;
    }
  }

  return -1; // Aucun swap possible
}
```

#### Étape 4 : Placement dans le tableau
```typescript
function placeBracket(matches: Match[]): Bracket {
  const bracket: Bracket = {
    rounds: []
  };

  // Déterminer le nombre de rounds
  const totalTeams = matches.length * 2;
  const numRounds = Math.log2(totalTeams);

  // Placer les matchs du premier tour
  bracket.rounds[0] = matches;

  // Créer les rounds suivants (vides au départ)
  for (let i = 1; i < numRounds; i++) {
    bracket.rounds[i] = createEmptyMatches(Math.pow(2, numRounds - i - 1));
  }

  return bracket;
}
```

### 6. Gestion de la progression

#### Mise à jour après chaque match
```typescript
function updateBracketAfterMatch(
  bracket: Bracket,
  matchId: string,
  winnerId: string
): void {
  const match = findMatch(bracket, matchId);
  const nextMatch = findNextMatch(bracket, matchId);

  if (nextMatch) {
    // Déterminer si le gagnant va en position 1 ou 2 du prochain match
    const position = getWinnerPosition(match, nextMatch);
    nextMatch[position] = winnerId;

    // Sauvegarder en base de données
    saveMatchUpdate(nextMatch);
  }
}
```

#### Détermination du champion
```typescript
function determineChampion(bracket: Bracket): Team | null {
  const finalMatch = bracket.rounds[bracket.rounds.length - 1][0];

  if (finalMatch.winnerId) {
    return getTeam(finalMatch.winnerId);
  }

  return null; // Finale pas encore jouée
}
```

### 7. Affichage et interface utilisateur

#### 7.1 Page admin `/tournaments/<slug>/admin`

**Nouvel onglet : "Phases finales"**
- Visible uniquement si le tournoi a des phases finales configurées
- Badge avec le nombre de matchs de phases finales

**Fonctionnalités :**
- ✅ Bouton "Générer le tableau des phases finales" (après la phase de poules)
- ✅ Visualisation du bracket complet
- ✅ Saisie des scores des matchs
- ✅ Mise à jour automatique du tableau
- ✅ Export du tableau en PDF/image

#### 7.2 Page publique `/tournoi/en-cours`

**Affichage du bracket :**
- Design inspiré des tableaux de tennis (Roland-Garros, Wimbledon)
- Navigation par rounds (16èmes, 8èmes, quarts, demi, finale)
- Mise en évidence des matchs en cours et terminés
- Fil d'ariane : Round actuel > Match en cours

#### 7.3 Design du bracket

**Inspirations visuelles :**
- [Wimbledon Draw](https://www.wimbledon.com/en_GB/draws/index.html)
- [Roland-Garros Tableau](https://www.rolandgarros.com/fr-fr/draws)
- ESPN Tournament Bracket

**Éléments de design :**
- Lignes de connexion entre les matchs
- Codes couleurs : Victoire (vert), En cours (orange), À venir (gris)
- Scores affichés pour les matchs terminés
- Hover states avec détails du match

### 8. Règles spécifiques du padel

#### Format des matchs en phases finales
- **Meilleur de 3 sets** (au lieu de 5 en phase de poules, pour accélérer)
- Règles des sets identiques à la phase de poules :
  - Premier à 6 jeux avec 2 jeux d'écart
  - Si 5-5 → jusqu'à 7-5
  - Si 6-6 → jusqu'à 7-6

#### Gestion des forfaits
- Si une équipe déclare forfait, l'équipe adverse passe au tour suivant
- Score technique : 6-0, 6-0
- L'équipe qualifiée par forfait hérite du seed de l'équipe forfait pour les tours suivants

#### Match pour la 3ème place
- **Optionnel** (à configurer dans les paramètres du tournoi)
- Oppose les deux perdants des demi-finales
- Même format que les autres matchs (meilleur de 3 sets)

### 9. Modèle de données

#### Table `playoff_rounds`
```sql
CREATE TABLE playoff_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id),
  round_number INT NOT NULL, -- 1 = 16èmes, 2 = 8èmes, etc.
  round_name TEXT NOT NULL, -- "16èmes de finale", "Quarts", etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Table `playoff_matches`
```sql
CREATE TABLE playoff_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id),
  round_id UUID NOT NULL REFERENCES playoff_rounds(id),
  match_number INT NOT NULL, -- Position dans le bracket
  team1_id UUID REFERENCES teams(id),
  team2_id UUID REFERENCES teams(id),
  winner_id UUID REFERENCES teams(id),
  team1_seed INT, -- Seed de l'équipe 1
  team2_seed INT, -- Seed de l'équipe 2
  scheduled_at TIMESTAMPTZ,
  next_match_id UUID REFERENCES playoff_matches(id), -- Match suivant si victoire
  next_match_position INT, -- 1 ou 2 (position dans le prochain match)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Table `playoff_sets`
```sql
CREATE TABLE playoff_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES playoff_matches(id),
  set_number INT NOT NULL,
  team1_score INT NOT NULL,
  team2_score INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 10. Configuration et paramètres

#### Paramètres du tournoi (JSON dans `tournaments.config`)
```json
{
  "pools_count": 4,
  "playoffs": {
    "enabled": true,
    "qualified_per_pool": 2,
    "sets_format": "best_of_3",
    "third_place_match": true,
    "auto_generate_bracket": true
  }
}
```

### 11. Cas particuliers et gestion d'erreurs

#### Cas 1 : Nombre impair de qualifiés
**Problème** : Impossible de faire un tableau à élimination directe avec un nombre impair d'équipes.
**Solution** : Arrondir au nombre pair supérieur et donner des **byes** (exemptions de premier tour) aux meilleures équipes.

**Exemple : 7 équipes qualifiées**
- Seed #1 a un bye → passe directement en demi-finale
- Les 6 autres jouent des quarts de finale

#### Cas 2 : Swap impossible (même poule)
**Problème** : Dans certaines configurations, il est impossible d'éviter qu'une équipe rencontre une autre de sa poule.
**Solution** :
1. Permettre l'exception et l'indiquer visuellement
2. Prioriser les swaps sur les matchs entre seeds les plus éloignés

#### Cas 3 : Égalité parfaite entre équipes
**Problème** : Deux équipes ont exactement les mêmes stats pour tous les critères de départage.
**Solution** : Tirage au sort automatique avec traçabilité (log de l'événement)

### 12. Checklist d'implémentation

#### Phase 1 : Modèle de données
- [ ] Créer les tables `playoff_rounds`, `playoff_matches`, `playoff_sets`
- [ ] Ajouter les champs `config.playoffs` dans la table `tournaments`
- [ ] Créer les types TypeScript correspondants

#### Phase 2 : Logique métier
- [ ] Fonction `calculateTeamSeeding()` - Calcul du classement global
- [ ] Fonction `generatePlayoffBracket()` - Génération du tableau
- [ ] Fonction `avoidSamePoolMatches()` - Application de la contrainte de poule
- [ ] Fonction `updateBracketAfterMatch()` - Mise à jour après chaque match

#### Phase 3 : Actions serveur
- [ ] `generatePlayoffBracketAction()` - Génération du bracket
- [ ] `updatePlayoffMatchScoreAction()` - MAJ des scores
- [ ] `resetPlayoffBracketAction()` - Régénération (si erreur)

#### Phase 4 : Interface admin
- [ ] Nouvel onglet "Phases finales" dans `/tournaments/<slug>/admin`
- [ ] Bouton "Générer le tableau"
- [ ] Visualisation du bracket
- [ ] Modal de saisie des scores

#### Phase 5 : Interface publique
- [ ] Affichage du bracket dans `/tournoi/en-cours`
- [ ] Navigation par rounds
- [ ] Design responsive

#### Phase 6 : Tests et validation
- [ ] Tests unitaires des fonctions de génération
- [ ] Tests d'intégration
- [ ] Tests avec différents nombres d'équipes (4, 8, 16, 32)
- [ ] Validation des règles de seeding

---

## 📊 Exemples concrets

### Exemple 1 : Tournoi à 4 poules, 2 qualifiés par poule (8 équipes)

#### Phase de poules - Résultats
| Poule | Équipe | Victoires | Goal Avg | Classement |
|-------|--------|-----------|----------|------------|
| A | Team A1 | 3 | +12 | 1er |
| A | Team A2 | 2 | +5 | 2ème |
| B | Team B1 | 3 | +10 | 1er |
| B | Team B2 | 1 | -2 | 2ème |
| C | Team C1 | 3 | +8 | 1er |
| C | Team C2 | 2 | +3 | 2ème |
| D | Team D1 | 3 | +7 | 1er |
| D | Team D2 | 2 | +4 | 2ème |

#### Seeding global
1. Team A1 (Poule A, +12)
2. Team B1 (Poule B, +10)
3. Team C1 (Poule C, +8)
4. Team D1 (Poule D, +7)
5. Team A2 (Poule A, +5)
6. Team D2 (Poule D, +4)
7. Team C2 (Poule C, +3)
8. Team B2 (Poule B, -2)

#### Bracket généré (Quarts de finale)
```
Quart 1: Seed #1 (Team A1) vs Seed #8 (Team B2) ✓ Poules différentes
Quart 2: Seed #4 (Team D1) vs Seed #5 (Team A2) ✓ Poules différentes
Quart 3: Seed #2 (Team B1) vs Seed #7 (Team C2) ✓ Poules différentes
Quart 4: Seed #3 (Team C1) vs Seed #6 (Team D2) ✓ Poules différentes
```

### Exemple 2 : Tournoi à 8 poules, 2 qualifiés par poule (16 équipes)

#### Seeding (simplifié)
Seeds 1-8 : Les 1ers de chaque poule
Seeds 9-16 : Les 2èmes de chaque poule

#### 8èmes de finale (avant swap)
```
Match 1: Seed #1 (Poule A, 1er) vs Seed #16 (Poule A, 2ème) ❌ Même poule!
Match 2: Seed #8 (Poule H, 1er) vs Seed #9 (Poule B, 2ème) ✓
Match 3: Seed #4 (Poule D, 1er) vs Seed #13 (Poule E, 2ème) ✓
Match 4: Seed #5 (Poule E, 1er) vs Seed #12 (Poule D, 2ème) ✓
Match 5: Seed #2 (Poule B, 1er) vs Seed #15 (Poule G, 2ème) ✓
Match 6: Seed #7 (Poule G, 1er) vs Seed #10 (Poule C, 2ème) ✓
Match 7: Seed #3 (Poule C, 1er) vs Seed #14 (Poule F, 2ème) ✓
Match 8: Seed #6 (Poule F, 1er) vs Seed #11 (Poule H, 2ème) ✓
```

#### Après swap (Match 1)
```
Match 1: Seed #1 (Poule A, 1er) vs Seed #15 (Poule G, 2ème) ✓ Swap avec Match 5
Match 5: Seed #2 (Poule B, 1er) vs Seed #16 (Poule A, 2ème) ✓
```

---

## 🎨 Références visuelles et inspiration

### Design de tableaux de knockout
- [Wimbledon Championships Draw](https://www.wimbledon.com/en_GB/draws/index.html)
- [UEFA Champions League Bracket](https://www.uefa.com/uefachampionsleague/)
- [FIFA World Cup Bracket 2026](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026)
- [March Madness Bracket](https://www.ncaa.com/march-madness)

---

## 📚 Sources et références

- [UEFA Champions League Format 2025/26](https://www.uefa.com/uefachampionsleague/news/0296-1d21e9bdf7e4-808a7511165c-1000--2025-26-champions-league-teams-format-dates-draws-final/)
- [FIFA World Cup 2026 Knockout Stage](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/knockout-stage-match-schedule-bracket)
- [How Grand Slam Tournament Draws Work](https://ausopen.com/articles/news/how-grand-slam-tournament-draws-are-made)
- [Seeding in Sports - Wikipedia](https://en.wikipedia.org/wiki/Seeding_(sports))

---

**Version** : 1.0
**Date** : 11 février 2026
**Auteur** : Tech Lead - Le tournoi des frérots
