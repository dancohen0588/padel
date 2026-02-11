# Analyse des bugs du bracket des phases finales

## 🔴 Problèmes identifiés

### 1. **CRITIQUE : Structure du bracket incorrecte**

**Fichier** : `src/app/actions/playoff-actions.ts` (lignes 316-317)

**Problème actuel** :
```typescript
const team1Seed = index === 0 ? matchIndex + 1 : null;
const team2Seed = index === 0 ? totalQualified - matchIndex : null;
```

Cette logique génère un bracket **linéaire** :
```
Pour 8 équipes (quarts de finale) :
Match 0: Seed #1 vs Seed #8
Match 1: Seed #2 vs Seed #7
Match 2: Seed #3 vs Seed #6
Match 3: Seed #4 vs Seed #5
```

**Conséquence** : TOUS les matchs sont créés séquentiellement, sans distinction gauche/droite du bracket.

**Structure correcte attendue** :
```
GAUCHE du bracket (Match 0-1) :
Match 0: Seed #1 vs Seed #8
Match 1: Seed #4 vs Seed #5

DROITE du bracket (Match 2-3) :
Match 2: Seed #2 vs Seed #7
Match 3: Seed #3 vs Seed #6
```

---

### 2. **CRITIQUE : Affichage en double des mêmes matchs**

**Fichier** : `src/components/tournaments/PlayoffBracket.tsx` (lignes 54-56, 86-127)

**Problème actuel** :
```typescript
const sideRounds = roundNumbers.filter((round) => round < maxRound).sort((a, b) => a - b);
const leftRounds = sideRounds;      // [1, 2, 3, 4]
const rightRounds = [...sideRounds].reverse();  // [4, 3, 2, 1]

// Plus loin...
{leftRounds.map((round) => (
  <RoundColumn matches={bracketData.rounds[round] ?? []} />  // TOUS les matchs du round
))}

{rightRounds.map((round) => (
  <RoundColumn matches={bracketData.rounds[round] ?? []} />  // LES MÊMES matchs !
))}
```

**Conséquence** : Le composant affiche les **MÊMES matchs des deux côtés** du bracket, ce qui explique pourquoi on voit les mêmes équipes à gauche et à droite.

**Exemple visuel du bug** :
```
GAUCHE (Round 1) :        |  FINALE  |     DROITE (Round 1) :
Match 0: A vs B          |          |     Match 0: A vs B  ← DUPLIQUÉ !
Match 1: C vs D          |          |     Match 1: C vs D  ← DUPLIQUÉ !
Match 2: E vs F          |          |     Match 2: E vs F  ← DUPLIQUÉ !
Match 3: G vs H          |          |     Match 3: G vs H  ← DUPLIQUÉ !
```

---

### 3. **Rounds manquants ou sautés**

**Symptôme** : On voit les 16èmes de finale, puis directement la finale, sans les 8èmes, quarts et demi-finales.

**Cause probable** :
- Le backend génère bien TOUS les rounds (vérifié dans le code)
- Mais le frontend ne les affiche pas correctement à cause de la logique de filtrage ou de la structure des données

**À vérifier** :
- La requête qui récupère les données du bracket
- La structure de `bracketData.rounds`

---

### 4. **Équipes qualifiées incorrectes**

**Fichier** : `src/app/actions/playoff-actions.ts` (fonction `buildSeeds`)

**Problème potentiel** : La fonction `buildSeeds` est complexe et peut mal trier les équipes.

**Points à vérifier** :
1. Le calcul des standings de poule (lignes 92-175)
2. La logique de qualification (lignes 177-251)
3. L'ordre de tri (points → set_diff → game_diff)

---

## ✅ Solutions proposées

### Solution 1 : Corriger la génération du bracket (Backend)

**Fichier** : `src/app/actions/playoff-actions.ts`

**Modifier la fonction de génération des matchs** (lignes 309-351) :

```typescript
// AVANT (INCORRECT)
for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
  const team1Seed = index === 0 ? matchIndex + 1 : null;
  const team2Seed = index === 0 ? totalQualified - matchIndex : null;
  // ...
}

// APRÈS (CORRECT)
for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
  let team1Seed = null;
  let team2Seed = null;

  if (index === 0) {
    // Premier round : appliquer la logique de bracket March Madness
    team1Seed = getBracketSeed(matchIndex, totalQualified, 'team1');
    team2Seed = getBracketSeed(matchIndex, totalQualified, 'team2');
  }
  // ...
}

// Nouvelle fonction helper
function getBracketSeed(
  matchIndex: number,
  totalQualified: number,
  position: 'team1' | 'team2'
): number {
  const halfMatches = totalQualified / 4; // Nombre de matchs par moitié de bracket

  // GAUCHE du bracket (première moitié des matchs)
  if (matchIndex < halfMatches) {
    if (position === 'team1') {
      // Graines paires ascendantes : 1, 4, 5, 8, 9...
      return matchIndex * 2 + 1;
    } else {
      // Graines impaires descendantes : totalQualified, totalQualified-3, totalQualified-4...
      return totalQualified - (matchIndex * 2);
    }
  }
  // DROITE du bracket (deuxième moitié des matchs)
  else {
    const rightIndex = matchIndex - halfMatches;
    if (position === 'team1') {
      // Graines impaires ascendantes : 2, 3, 6, 7, 10...
      return rightIndex * 2 + 2;
    } else {
      // Graines paires descendantes : totalQualified-1, totalQualified-2, totalQualified-5...
      return totalQualified - 1 - (rightIndex * 2);
    }
  }
}
```

**Exemple pour 8 équipes** :
```
Match 0: getBracketSeed(0, 8, 'team1') = 1, getBracketSeed(0, 8, 'team2') = 8  → Seed #1 vs #8
Match 1: getBracketSeed(1, 8, 'team1') = 4, getBracketSeed(1, 8, 'team2') = 5  → Seed #4 vs #5
Match 2: getBracketSeed(2, 8, 'team1') = 2, getBracketSeed(2, 8, 'team2') = 7  → Seed #2 vs #7
Match 3: getBracketSeed(3, 8, 'team1') = 3, getBracketSeed(3, 8, 'team2') = 6  → Seed #3 vs #6
```

---

### Solution 2 : Corriger l'affichage du bracket (Frontend)

**Fichier** : `src/components/tournaments/PlayoffBracket.tsx`

**Option A : Diviser les matchs en deux moitiés**

```typescript
// Modifier la logique d'affichage (lignes 48-57)
const roundNumbers = useMemo(
  () => Object.keys(bracketData.rounds).map((value) => Number(value)),
  [bracketData.rounds]
);

const maxRound = roundNumbers.length ? Math.max(...roundNumbers) : 0;
const sideRounds = roundNumbers.filter((round) => round < maxRound).sort((a, b) => a - b);

// NOUVEAU : Diviser les matchs en gauche/droite
const leftRoundsData = useMemo(() => {
  return sideRounds.reduce((acc, round) => {
    const matches = bracketData.rounds[round] ?? [];
    const halfCount = Math.ceil(matches.length / 2);
    acc[round] = matches.slice(0, halfCount); // Première moitié = GAUCHE
    return acc;
  }, {} as Record<number, PlayoffMatch[]>);
}, [bracketData.rounds, sideRounds]);

const rightRoundsData = useMemo(() => {
  return [...sideRounds].reverse().reduce((acc, round) => {
    const matches = bracketData.rounds[round] ?? [];
    const halfCount = Math.ceil(matches.length / 2);
    acc[round] = matches.slice(halfCount); // Deuxième moitié = DROITE
    return acc;
  }, {} as Record<number, PlayoffMatch[]>);
}, [bracketData.rounds, sideRounds]);

// Affichage
{sideRounds.map((round) => (
  <RoundColumn
    key={`left-${round}`}
    roundNumber={round}
    matches={leftRoundsData[round] ?? []}  // Première moitié
    onMatchClick={onMatchClick}
  />
))}

{/* Finale au centre */}

{[...sideRounds].reverse().map((round) => (
  <RoundColumn
    key={`right-${round}`}
    roundNumber={round}
    matches={rightRoundsData[round] ?? []}  // Deuxième moitié
    onMatchClick={onMatchClick}
  />
))}
```

---

### Solution 3 : Vérifier la récupération des données

**Fichier à vérifier** : Celui qui appelle le composant `PlayoffBracket`

**Vérifier que** :
1. Tous les rounds sont bien récupérés de la base de données
2. La structure de `bracketData.rounds` est correcte
3. Les matchs sont bien groupés par round

**Requête SQL à vérifier** :
```sql
SELECT
  pm.*,
  pr.round_number,
  pr.round_name,
  t1.name as team1_name,
  t2.name as team2_name
FROM playoff_matches pm
JOIN playoff_rounds pr ON pr.id = pm.round_id
LEFT JOIN teams t1 ON t1.id = pm.team1_id
LEFT JOIN teams t2 ON t2.id = pm.team2_id
WHERE pm.tournament_id = ?
ORDER BY pr.round_number, pm.match_number
```

---

## 🧪 Tests à effectuer après correction

### Test 1 : Bracket pour 8 équipes qualifiées (Quarts de finale)
```
Configuration : 4 poules × 2 qualifiés = 8 équipes

Résultat attendu :
- 1 round de quarts (4 matchs)
- 1 round de demi (2 matchs)
- 1 finale (1 match)

Structure attendue :
GAUCHE:
  Quart 1: Seed #1 vs Seed #8
  Quart 2: Seed #4 vs Seed #5

DROITE:
  Quart 3: Seed #2 vs Seed #7
  Quart 4: Seed #3 vs Seed #6
```

### Test 2 : Bracket pour 16 équipes qualifiées (8èmes de finale)
```
Configuration : 8 poules × 2 qualifiés = 16 équipes

Résultat attendu :
- 1 round de 8èmes (8 matchs)
- 1 round de quarts (4 matchs)
- 1 round de demi (2 matchs)
- 1 finale (1 match)

Structure attendue :
GAUCHE (4 matchs):
  8ème 1: Seed #1 vs Seed #16
  8ème 2: Seed #8 vs Seed #9
  8ème 3: Seed #4 vs Seed #13
  8ème 4: Seed #5 vs Seed #12

DROITE (4 matchs):
  8ème 5: Seed #2 vs Seed #15
  8ème 6: Seed #7 vs Seed #10
  8ème 7: Seed #3 vs Seed #14
  8ème 8: Seed #6 vs Seed #11
```

### Test 3 : Vérifier les équipes qualifiées
```
1. Vérifier le classement dans l'onglet "Matchs & Classement"
2. Comparer avec les équipes dans le bracket
3. S'assurer que les seeds correspondent aux rangs

Exemple :
- 1er de poule A avec meilleur goal average → Seed #1
- 1er de poule B avec 2ème meilleur goal average → Seed #2
- Etc.
```

---

## 📝 Récapitulatif des fichiers à modifier

1. ✅ **Backend** : `src/app/actions/playoff-actions.ts`
   - Modifier la fonction de génération des seeds (lignes 316-317)
   - Ajouter la fonction helper `getBracketSeed()`

2. ✅ **Frontend** : `src/components/tournaments/PlayoffBracket.tsx`
   - Diviser les matchs en deux moitiés (gauche/droite)
   - Modifier la logique d'affichage (lignes 48-127)

3. ⚠️ **À vérifier** : Le fichier qui récupère les données du bracket
   - S'assurer que tous les rounds sont récupérés
   - Vérifier la structure de `bracketData.rounds`

---

## 🎯 Ordre de priorité des corrections

1. **URGENT** : Corriger la génération du bracket (Backend)
   - C'est la cause racine du problème

2. **URGENT** : Corriger l'affichage (Frontend)
   - Diviser les matchs en gauche/droite

3. **IMPORTANT** : Vérifier la récupération des données
   - S'assurer que tous les rounds sont présents

4. **IMPORTANT** : Vérifier le seeding des équipes
   - S'assurer que les bonnes équipes sont qualifiées

---

**Date d'analyse** : 11 février 2026
**Auteur** : Tech Lead - Le tournoi des frérots
