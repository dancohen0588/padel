# Prompt Roo - Correction des labels des rounds du bracket

## 🔴 Problème

Les labels des rounds (16èmes, 8èmes, Quarts, Demi) sont **codés en dur** dans le frontend et ne correspondent pas au nombre réel d'équipes.

**Exemple du bug** :
- Configuration : 8 équipes qualifiées
- Attendu : "Quarts" → "Demi" → "Finale"
- Actuel : "16èmes" → "8èmes" → "Quarts" ❌

**Cause** : Le composant utilise un mapping fixe basé sur le numéro de round au lieu d'utiliser les noms générés par le backend.

---

## ✅ Solution

Utiliser les noms de rounds qui viennent du backend (`round_name`) au lieu du mapping fixe.

---

## 🔧 Correctif à appliquer

**Fichier** : `/src/components/tournaments/PlayoffBracket.tsx`

### Étape 1 : Supprimer le mapping fixe

**SUPPRIMER** les lignes 12-17 :

```typescript
// ❌ À SUPPRIMER
const roundLabels: Record<number, string> = {
  1: "16èmes",
  2: "8èmes",
  3: "Quarts",
  4: "Demi",
};
```

### Étape 2 : Modifier la fonction RoundColumn

**Localiser** la fonction `RoundColumn` (ligne ~140) et **modifier** l'affichage du label :

```typescript
// AVANT (ligne ~143-144)
<div className="rounded-lg bg-white/5 p-2 text-center text-sm font-semibold uppercase text-white/50">
  {roundLabels[roundNumber] ?? `Round ${roundNumber}`}
</div>

// APRÈS
<div className="rounded-lg bg-white/5 p-2 text-center text-sm font-semibold uppercase text-white/50">
  {getRoundLabel(matches, roundNumber)}
</div>
```

### Étape 3 : Ajouter une fonction helper

**Ajouter** cette fonction helper **avant** la fonction `RoundColumn` (ligne ~134) :

```typescript
/**
 * Récupère le label du round depuis les données du bracket
 * Utilise le round_name généré par le backend
 */
function getRoundLabel(matches: PlayoffMatch[], roundNumber: number): string {
  // Essayer de récupérer le nom depuis les données du match
  const roundName = matches[0]?.round?.round_name;

  if (roundName) {
    // Extraire le nom court (ex: "Quarts de finale" → "Quarts")
    if (roundName.includes("16èmes")) return "16èmes";
    if (roundName.includes("8èmes")) return "8èmes";
    if (roundName.includes("Quarts")) return "Quarts";
    if (roundName.includes("Demi")) return "Demi";
    if (roundName.includes("Finale")) return "Finale";
  }

  // Fallback si pas de round_name
  return `Round ${roundNumber}`;
}
```

---

## 🧪 Vérification

Après correction, pour un bracket de **8 équipes** :

```
GAUCHE:              |  FINALE  |     DROITE:
┌─────────────┐     |          |     ┌─────────────┐
│   Quarts    │ ✓   |          |     │   Quarts    │ ✓
└─────────────┘     |          |     └─────────────┘
  #1 vs #8          |          |       #2 vs #7
  #4 vs #5          |          |       #3 vs #6
                    |          |
┌─────────────┐     |          |     ┌─────────────┐
│    Demi     │ ✓   |          |     │    Demi     │ ✓
└─────────────┘     |          |     └─────────────┘
```

Pour un bracket de **16 équipes** :

```
GAUCHE:              |  FINALE  |     DROITE:
┌─────────────┐     |          |     ┌─────────────┐
│   8èmes     │ ✓   |          |     │   8èmes     │ ✓
└─────────────┘     |          |     └─────────────┘
  4 matchs          |          |       4 matchs
                    |          |
┌─────────────┐     |          |     ┌─────────────┐
│   Quarts    │ ✓   |          |     │   Quarts    │ ✓
└─────────────┘     |          |     └─────────────┘
  2 matchs          |          |       2 matchs
                    |          |
┌─────────────┐     |          |     ┌─────────────┐
│    Demi     │ ✓   |          |     │    Demi     │ ✓
└─────────────┘     |          |     └─────────────┘
  1 match           |          |       1 match
```

---

## 📝 Code complet de la section modifiée

```typescript
// Ligne ~134 : Ajouter la fonction helper
function getRoundLabel(matches: PlayoffMatch[], roundNumber: number): string {
  const roundName = matches[0]?.round?.round_name;

  if (roundName) {
    if (roundName.includes("16èmes")) return "16èmes";
    if (roundName.includes("8èmes")) return "8èmes";
    if (roundName.includes("Quarts")) return "Quarts";
    if (roundName.includes("Demi")) return "Demi";
    if (roundName.includes("Finale")) return "Finale";
  }

  return `Round ${roundNumber}`;
}

// Ligne ~140 : Fonction RoundColumn modifiée
function RoundColumn({ roundNumber, matches, onMatchClick }: RoundColumnProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg bg-white/5 p-2 text-center text-sm font-semibold uppercase text-white/50">
        {getRoundLabel(matches, roundNumber)}
      </div>
      <div className="flex flex-col">
        {matches.map((match, index) => (
          <div
            key={match.id}
            className={cn(index < matches.length - 1 && roundSpacing[roundNumber])}
          >
            <MatchCard match={match} onClick={() => onMatchClick(match.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## ✅ Checklist

- [ ] Supprimer le mapping `roundLabels` (lignes 12-17)
- [ ] Ajouter la fonction `getRoundLabel()` avant `RoundColumn`
- [ ] Modifier l'affichage dans `RoundColumn` pour utiliser `getRoundLabel()`
- [ ] Tester avec 8 équipes : doit afficher "Quarts" → "Demi" → "Finale" ✓
- [ ] Tester avec 16 équipes : doit afficher "8èmes" → "Quarts" → "Demi" → "Finale" ✓
- [ ] Tester avec 32 équipes : doit afficher "16èmes" → "8èmes" → "Quarts" → "Demi" → "Finale" ✓

---

## 📌 Notes

- Cette correction utilise les données déjà présentes dans `match.round.round_name`
- Aucune modification backend nécessaire
- Le backend génère déjà les bons noms via `roundNameByTeams()`
- Pas besoin de régénérer les brackets existants pour cette correction

---

**Fin du prompt de correctif**
