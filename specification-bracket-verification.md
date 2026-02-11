# Plan de vérification bracket phases finales (8/16/32 équipes)

## 0) Prérequis

- Bracket régénéré après correctif : exécuter le script manuel.
- La page admin est accessible avec le token : `/admin/inscriptions?token=ADMIN_TOKEN`.

## 1) Test structure 8 équipes

### Données attendues (quarts)

- GAUCHE
  - Match 1 : Seed #1 vs Seed #8
  - Match 2 : Seed #4 vs Seed #5
- DROITE
  - Match 3 : Seed #2 vs Seed #7
  - Match 4 : Seed #3 vs Seed #6

### Vérifications visuelles

- 4 matchs de quarts (2 à gauche, 2 à droite)
- 2 matchs de demi
- 1 finale
- Seed #1 en haut à gauche, Seed #2 en haut à droite

## 2) Test structure 16 équipes

### Données attendues (8èmes)

- GAUCHE
  - Match 1 : Seed #1 vs Seed #16
  - Match 2 : Seed #8 vs Seed #9
  - Match 3 : Seed #4 vs Seed #13
  - Match 4 : Seed #5 vs Seed #12
- DROITE
  - Match 5 : Seed #2 vs Seed #15
  - Match 6 : Seed #7 vs Seed #10
  - Match 7 : Seed #3 vs Seed #14
  - Match 8 : Seed #6 vs Seed #11

### Vérifications visuelles

- 8 matchs de 8èmes (4 à gauche, 4 à droite)
- 4 matchs de quarts
- 2 matchs de demi
- 1 finale

## 3) Test structure 32 équipes

### Vérifications visuelles

- 16 matchs de 16èmes (8 à gauche, 8 à droite)
- 8 matchs de 8èmes
- 4 matchs de quarts
- 2 matchs de demi
- 1 finale

## 4) Test cohérence seeding

- Dans "Matchs & Classement", relever le classement global.
- Vérifier que Seed #1 = meilleur classement général, Seed #2 = second, etc.
- Vérifier que les seeds matchent le pattern March Madness sur le 1er round.

## 5) Test progression des matchs

- Saisir un score sur un match de gauche (ex: Seed #1 gagne).
- Vérifier que le gagnant apparaît dans la demi-finale de gauche.
- Répéter sur un match de droite.

