# Prompt Roo/ChatGPT 5.2 Codex - Correctif des bugs du bracket des phases finales

## 📋 Contexte

Deux bugs critiques ont été identifiés dans le système de génération et d'affichage du bracket des phases finales :

1. **Bug Backend** : Le bracket génère tous les matchs de manière linéaire sans distinction gauche/droite
2. **Bug Frontend** : Le composant affiche les mêmes matchs des deux côtés du bracket

**Conséquences** :
- Les mêmes équipes apparaissent à gauche et à droite du bracket
- La structure March Madness n'est pas respectée
- Configuration de 8 équipes qualifiées peut générer des rounds incorrects

---

## 🔧 Correctif #1 : Backend - Génération du bracket

**Fichier** : `/src/app/actions/playoff-actions.ts`

### Code actuel (lignes 309-351) :

```typescript
const matchesByRound: Array<Array<{ id: string }>> = [];
for (let index = 0; index < rounds.length; index += 1) {
  const round = rounds[index];
  const matchCount = round.matchCount;
  const roundMatches: Array<{ id: string }> = [];

  for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
    const team1Seed = index === 0 ? matchIndex + 1 : null;
    const team2Seed = index === 0 ? totalQualified - matchIndex : null;
    // ... reste du code
  }
}
```

### Code corrigé :

**Étape 1** : Ajouter une fonction helper en haut du fichier (après les imports, avant les autres fonctions) :

```typescript
/**
 * Calcule le seed correct pour un match dans un bracket March Madness
 * @param matchIndex Index du match dans le round (0-based)
 * @param totalQualified Nombre total d'équipes qualifiées
 * @param position Position dans le match ('team1' ou 'team2')
 * @returns Le numéro de seed
 */
const getBracketSeed = (
  matchIndex: number,
  totalQualified: number,
  position: 'team1' | 'team2'
): number => {
  const totalMatches = totalQualified / 2;
  const halfMatches = totalMatches / 2;

  // Déterminer si on est dans la moitié GAUCHE ou DROITE du bracket
  const isLeftSide = matchIndex < halfMatches;

  if (isLeftSide) {
    // GAUCHE du bracket
    if (position === 'team1') {
      // Seeds : 1, 4, 5, 8, 9, 12, 13, 16...
      // Pattern : pour chaque match i, seed = 4*i + 1 ou 4*i + 4
      const groupIndex = Math.floor(matchIndex / 2);
      const isFirstInGroup = matchIndex % 2 === 0;
      return isFirstInGroup ? (4 * groupIndex + 1) : (4 * groupIndex + 4);
    } else {
      // Seeds : totalQualified, totalQualified-3, totalQualified-4, totalQualified-7...
      const groupIndex = Math.floor(matchIndex / 2);
      const isFirstInGroup = matchIndex % 2 === 0;
      return isFirstInGroup ? totalQualified - (4 * groupIndex) : totalQualified - (4 * groupIndex + 3);
    }
  } else {
    // DROITE du bracket
    const rightIndex = matchIndex - halfMatches;
    if (position === 'team1') {
      // Seeds : 2, 3, 6, 7, 10, 11, 14, 15...
      const groupIndex = Math.floor(rightIndex / 2);
      const isFirstInGroup = rightIndex % 2 === 0;
      return isFirstInGroup ? (4 * groupIndex + 2) : (4 * groupIndex + 3);
    } else {
      // Seeds : totalQualified-1, totalQualified-2, totalQualified-5, totalQualified-6...
      const groupIndex = Math.floor(rightIndex / 2);
      const isFirstInGroup = rightIndex % 2 === 0;
      return isFirstInGroup ? totalQualified - 1 - (4 * groupIndex) : totalQualified - 2 - (4 * groupIndex);
    }
  }
};
```

**Étape 2** : Remplacer les lignes 316-317 dans la boucle de génération des matchs :

```typescript
// REMPLACER CES DEUX LIGNES :
const team1Seed = index === 0 ? matchIndex + 1 : null;
const team2Seed = index === 0 ? totalQualified - matchIndex : null;

// PAR :
let team1Seed = null;
let team2Seed = null;

if (index === 0) {
  // Premier round : utiliser la fonction getBracketSeed
  team1Seed = getBracketSeed(matchIndex, totalQualified, 'team1');
  team2Seed = getBracketSeed(matchIndex, totalQualified, 'team2');
}
```

**Vérification du correctif** :

Pour 8 équipes qualifiées (4 matchs de quarts) :
```
Match 0: getBracketSeed(0, 8, 'team1') = 1, getBracketSeed(0, 8, 'team2') = 8  → Seed #1 vs #8 ✓
Match 1: getBracketSeed(1, 8, 'team1') = 4, getBracketSeed(1, 8, 'team2') = 5  → Seed #4 vs #5 ✓
Match 2: getBracketSeed(2, 8, 'team1') = 2, getBracketSeed(2, 8, 'team2') = 7  → Seed #2 vs #7 ✓
Match 3: getBracketSeed(3, 8, 'team1') = 3, getBracketSeed(3, 8, 'team2') = 6  → Seed #3 vs #6 ✓
```

Pour 16 équipes qualifiées (8 matchs de 8èmes) :
```
GAUCHE (Match 0-3):
Match 0: Seed #1 vs #16 ✓
Match 1: Seed #8 vs #9 ✓
Match 2: Seed #4 vs #13 ✓
Match 3: Seed #5 vs #12 ✓

DROITE (Match 4-7):
Match 4: Seed #2 vs #15 ✓
Match 5: Seed #7 vs #10 ✓
Match 6: Seed #3 vs #14 ✓
Match 7: Seed #6 vs #11 ✓
```

---

## 🔧 Correctif #2 : Frontend - Affichage du bracket

**Fichier** : `/src/components/tournaments/PlayoffBracket.tsx`

### Code actuel (lignes 48-127) :

```typescript
const maxRound = roundNumbers.length ? Math.max(...roundNumbers) : 0;
const sideRounds = roundNumbers.filter((round) => round < maxRound).sort((a, b) => a - b);
const leftRounds = sideRounds;
const rightRounds = [...sideRounds].reverse();
const finalRoundMatches = maxRound ? bracketData.rounds[maxRound] ?? [] : [];

// ...

{leftRounds.map((round) => (
  <RoundColumn
    key={`left-${round}`}
    roundNumber={round}
    matches={bracketData.rounds[round] ?? []}  // ❌ TOUS les matchs
    onMatchClick={onMatchClick}
  />
))}

{rightRounds.map((round) => (
  <RoundColumn
    key={`right-${round}`}
    roundNumber={round}
    matches={bracketData.rounds[round] ?? []}  // ❌ LES MÊMES matchs
    onMatchClick={onMatchClick}
  />
))}
```

### Code corrigé :

**Remplacer tout le bloc (lignes 48-127)** par :

```typescript
const maxRound = roundNumbers.length ? Math.max(...roundNumbers) : 0;
const sideRounds = roundNumbers.filter((round) => round < maxRound).sort((a, b) => a - b);
const finalRoundMatches = maxRound ? bracketData.rounds[maxRound] ?? [] : [];

// NOUVEAU : Diviser les matchs en gauche/droite
const leftRoundsData = useMemo(() => {
  return sideRounds.reduce((acc, round) => {
    const matches = bracketData.rounds[round] ?? [];
    const halfCount = Math.ceil(matches.length / 2);
    acc[round] = matches.slice(0, halfCount); // ✅ Première moitié = GAUCHE
    return acc;
  }, {} as Record<number, PlayoffMatch[]>);
}, [bracketData.rounds, sideRounds]);

const rightRoundsData = useMemo(() => {
  return sideRounds.reduce((acc, round) => {
    const matches = bracketData.rounds[round] ?? [];
    const halfCount = Math.ceil(matches.length / 2);
    acc[round] = matches.slice(halfCount); // ✅ Deuxième moitié = DROITE
    return acc;
  }, {} as Record<number, PlayoffMatch[]>);
}, [bracketData.rounds, sideRounds]);

return (
  <div className="space-y-4">
    {totalSlots > 0 && fillPercentage < 100 ? (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-white/70">Remplissage du tableau</span>
          <span className="text-sm font-semibold text-orange-500">{fillPercentage}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500"
            style={{ width: `${fillPercentage}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-white/50">
          Les équipes se qualifient au fur et à mesure des résultats de poules.
        </p>
      </div>
    ) : null}

    <div className="overflow-x-auto py-5">
      <div
        className="grid min-w-[1400px] items-center gap-4"
        style={{
          gridTemplateColumns: "2fr 1.5fr 1fr 0.8fr auto 0.8fr 1fr 1.5fr 2fr",
        }}
      >
        {/* GAUCHE : Première moitié des matchs */}
        {sideRounds.map((round) => (
          <RoundColumn
            key={`left-${round}`}
            roundNumber={round}
            matches={leftRoundsData[round] ?? []}
            onMatchClick={onMatchClick}
          />
        ))}

        {/* FINALE au centre */}
        <div className="flex flex-col gap-3">
          <div className="rounded-lg bg-white/5 p-2 text-center text-sm font-semibold uppercase text-white/50">
            Finale
          </div>
          {finalRoundMatches[0] ? (
            <MatchCard
              match={finalRoundMatches[0]}
              onClick={() => onMatchClick(finalRoundMatches[0].id)}
              isFinal
            />
          ) : (
            <EmptyFinal />
          )}
          {bracketData.champion ? (
            <div className="mt-4 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 p-3 text-center">
              <div className="mb-1 text-xs uppercase tracking-wide text-white/80">
                Champion du tournoi
              </div>
              <div className="text-lg font-bold text-white">
                {bracketData.champion.name ?? "Champion"}
              </div>
            </div>
          ) : null}
        </div>

        {/* DROITE : Deuxième moitié des matchs */}
        {[...sideRounds].reverse().map((round) => (
          <RoundColumn
            key={`right-${round}`}
            roundNumber={round}
            matches={rightRoundsData[round] ?? []}
            onMatchClick={onMatchClick}
          />
        ))}
      </div>
    </div>
  </div>
);
```

**Points importants du correctif** :
1. ✅ `leftRoundsData` contient la première moitié des matchs de chaque round
2. ✅ `rightRoundsData` contient la deuxième moitié des matchs de chaque round
3. ✅ Les rounds à droite sont affichés en ordre inverse (pour convergence vers la finale)
4. ✅ Utilisation de `useMemo` pour optimiser les performances

---

## 🧪 Tests à effectuer après correctif

### Test 1 : Régénérer les brackets existants

Après avoir appliqué les correctifs, il faut **régénérer** les brackets des tournois existants car les anciens matchs ont été créés avec la mauvaise logique.

**Script SQL à exécuter** :
```sql
-- Pour chaque tournoi avec playoffs activés, supprimer et régénérer
DELETE FROM playoff_sets WHERE match_id IN (
  SELECT id FROM playoff_matches WHERE tournament_id = 'TOURNAMENT_ID'
);
DELETE FROM playoff_matches WHERE tournament_id = 'TOURNAMENT_ID';
DELETE FROM playoff_rounds WHERE tournament_id = 'TOURNAMENT_ID';

-- Puis appeler la fonction generateEmptyPlayoffBracket() depuis l'interface admin
```

**OU** créer une action admin pour régénérer :
```typescript
// Ajouter un bouton dans l'interface admin
<button onClick={() => regenerateBracket(tournamentId)}>
  Régénérer le bracket
</button>
```

### Test 2 : Vérifier la structure pour 8 équipes

**Tournoi test-3** : 8 équipes qualifiées

Résultat attendu :
```
GAUCHE:
  Quart 1: Seed #1 vs Seed #8
  Quart 2: Seed #4 vs Seed #5

DROITE:
  Quart 3: Seed #2 vs Seed #7
  Quart 4: Seed #3 vs Seed #6
```

Vérifier visuellement :
- ✅ Les équipes à gauche sont différentes de celles à droite
- ✅ Seed #1 est à gauche en haut
- ✅ Seed #2 est à droite en haut
- ✅ 4 matchs de quarts visibles
- ✅ 2 matchs de demi visibles
- ✅ 1 finale visible

### Test 3 : Vérifier la structure pour 16 équipes

**Tournoi test-2** : 16 équipes qualifiées

Résultat attendu :
```
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

Vérifier :
- ✅ 8 matchs de 8èmes visibles (4 à gauche, 4 à droite)
- ✅ 4 matchs de quarts visibles
- ✅ 2 matchs de demi visibles
- ✅ 1 finale visible
- ✅ TOUS les rounds sont présents (pas de saut de 8èmes à finale)

### Test 4 : Vérifier le seeding des équipes

Pour chaque tournoi :
1. Aller dans l'onglet "Matchs & Classement"
2. Noter les 8 (ou 16) premières équipes du classement
3. Vérifier que ces équipes correspondent aux seeds du bracket
4. Vérifier que Seed #1 = 1er du classement général

**Exemple** :
```
Classement général :
1. Les Champions A (Poule A, 1er, +15 GA)  → Seed #1 ✓
2. Les Invincibles B (Poule B, 1er, +12 GA) → Seed #2 ✓
3. Dream Team C (Poule C, 1er, +10 GA)      → Seed #3 ✓
...
```

### Test 5 : Vérifier la progression des matchs

1. Saisir un score pour un match de quarts (ex: Seed #1 bat Seed #8)
2. Vérifier que le gagnant apparaît dans le match de demi-finale correspondant
3. Vérifier que c'est bien le match de demi-finale du **côté gauche** (pas à droite)

---

## ✅ Checklist de validation

Avant de considérer le correctif terminé :

- [ ] Code backend modifié dans `playoff-actions.ts`
- [ ] Fonction `getBracketSeed()` ajoutée et testée
- [ ] Code frontend modifié dans `PlayoffBracket.tsx`
- [ ] `leftRoundsData` et `rightRoundsData` créés avec `useMemo`
- [ ] Brackets existants régénérés (suppression + recréation)
- [ ] Test visuel : équipes différentes à gauche et à droite ✓
- [ ] Test structure 8 équipes : 4 quarts, 2 demi, 1 finale ✓
- [ ] Test structure 16 équipes : 8 huitièmes, 4 quarts, 2 demi, 1 finale ✓
- [ ] Test seeding : les bonnes équipes qualifiées ✓
- [ ] Test progression : gagnants passent au bon match suivant ✓

---

## 📌 Notes importantes

1. **Impacts des modifications** :
   - Ces modifications ne cassent rien d'autre dans l'application
   - Les matchs de poules ne sont pas affectés
   - La logique de seeding (`buildSeeds`) reste inchangée
   - Seule la génération et l'affichage du bracket changent

2. **Compatibilité** :
   - Les anciens brackets doivent être régénérés
   - Aucune migration de base de données nécessaire
   - Les tables restent identiques

3. **Performance** :
   - Utilisation de `useMemo` pour optimiser le rendu
   - Pas d'impact sur les temps de chargement

4. **Tests unitaires** (optionnel) :
   - Créer des tests pour `getBracketSeed()` avec différentes valeurs
   - Vérifier que la structure du bracket est correcte pour 4, 8, 16, 32 équipes

---

**Fin du prompt de correctif pour Roo/ChatGPT 5.2 Codex**
