# Script de Génération de Données de Test

Ce script génère des données réalistes pour tester l'application "Le Tournoi des Frérots".

## 📊 Données Générées

- **100 joueurs** avec noms français réels
- **10 tournois** sur les 2 dernières années (espacés de 1-2 mois)
- **15 à 30 équipes** par tournoi (paires aléatoires)
- **4 à 7 poules** par tournoi selon le nombre d'équipes
- **Matchs de poules** avec résultats aléatoires réalistes
- **Phases finales** avec les 16 meilleures équipes
- **Vainqueurs** désignés pour chaque tournoi

## 🚀 Installation

### 1. Installer les Dépendances

```bash
npm install --save-dev tsx @neondatabase/serverless postgres ws @types/ws
```

### 2. Configurer les Variables d'Environnement

Assurez-vous que `.env.local` contient :

```bash
DATABASE_URL=postgresql://...
```

## ▶️ Exécution

### Option 1 : Avec tsx (Recommandé)

```bash
npx tsx seed-database.ts
```

### Option 2 : Avec ts-node

```bash
npx ts-node seed-database.ts
```

### Option 3 : Compiler puis exécuter

```bash
npx tsc seed-database.ts
node seed-database.js
```

## ⏱️ Temps d'Exécution

Le script prend environ **2-3 minutes** pour générer toutes les données (dépend de la latence réseau avec Neon).

## 📋 Détails de Génération

### Joueurs
- Prénoms : 100 prénoms français communs
- Noms : 100 noms de famille français
- Emails : `prenom.nom@gmail.com` ou `prenom.nom@hotmail.fr`
- Niveaux : beginner, intermediate, advanced, expert (aléatoire)
- Téléphones : Format français (+336...)

### Tournois
- Noms : "Tournoi [Ville] [Mois Année]"
- Villes : Paris, Lyon, Marseille, Toulouse, Nice, Nantes, Strasbourg, Bordeaux, Lille, Rennes
- Dates : Espacées de 1-2 mois sur les 2 dernières années
- Statut : `completed`
- Max participants : 64
- Teams qualifiées : 16

### Équipes
- Paires aléatoires parmi les 100 joueurs
- Chaque équipe joue tous ses matchs de poule
- Nom : "Prénom1 & Prénom2"

### Matchs
- **Poules** : Round-robin (chaque équipe contre toutes les autres de sa poule)
- **Score** : Meilleur de 3 sets
  - 60% des matchs en 2 sets (6-x, 6-x)
  - 40% des matchs en 3 sets (6-x, x-6, 6-x)
  - Scores réalistes : 6-0, 6-1, 6-2, 6-3, 6-4, 6-5, 7-6

### Phases Finales
- Rounds : 16èmes, 8èmes, Quarts, Demi-finales, Finale
- 16 meilleures équipes qualifiées (selon victoires, sets gagnés, jeux gagnés)
- Bracket à élimination directe
- Vainqueur désigné à la fin

## 🧹 Nettoyage de la Base (Avant Seed)

Si vous voulez réinitialiser complètement la base avant de lancer le seed :

```sql
-- ATTENTION : Supprime toutes les données !
TRUNCATE TABLE sets CASCADE;
TRUNCATE TABLE matches CASCADE;
TRUNCATE TABLE playoff_rounds CASCADE;
TRUNCATE TABLE pool_teams CASCADE;
TRUNCATE TABLE pools CASCADE;
TRUNCATE TABLE team_members CASCADE;
TRUNCATE TABLE teams CASCADE;
TRUNCATE TABLE participations CASCADE;
TRUNCATE TABLE players CASCADE;
TRUNCATE TABLE tournaments CASCADE;

-- Réinitialiser les séquences si nécessaire
-- (Pas nécessaire avec des UUID)
```

## 🔍 Vérification des Données

Après l'exécution du script, vérifiez les données :

```sql
-- Nombre de joueurs
SELECT COUNT(*) FROM players;
-- Devrait afficher : 100

-- Nombre de tournois
SELECT COUNT(*) FROM tournaments;
-- Devrait afficher : 10

-- Tournois avec leurs statistiques
SELECT
  t.name,
  t.start_date,
  COUNT(DISTINCT tm.team_id) as nb_equipes,
  COUNT(DISTINCT p.id) as nb_poules,
  COUNT(DISTINCT m.id) as nb_matchs,
  tw.name as vainqueur
FROM tournaments t
LEFT JOIN teams tm ON tm.tournament_id = t.id
LEFT JOIN pools p ON p.tournament_id = t.id
LEFT JOIN matches m ON m.tournament_id = t.id
LEFT JOIN teams tw ON tw.id = t.winner_id
GROUP BY t.id, t.name, t.start_date, tw.name
ORDER BY t.start_date DESC;

-- Statistiques globales
SELECT
  (SELECT COUNT(*) FROM players) as joueurs,
  (SELECT COUNT(*) FROM tournaments) as tournois,
  (SELECT COUNT(*) FROM teams) as equipes,
  (SELECT COUNT(*) FROM matches WHERE status = 'completed') as matchs,
  (SELECT COUNT(*) FROM sets) as sets;
```

## ⚠️ Notes Importantes

1. **Idempotence** : Le script **N'EST PAS** idempotent. Si vous le relancez, il créera de nouvelles données en plus des anciennes. Nettoyez la base avant si nécessaire.

2. **Contraintes** : Le script respecte toutes les contraintes de la base :
   - Email unique par joueur
   - Pas de doublon de participation (joueur + tournoi)
   - Scores de sets valides (6-0 à 7-6)

3. **Performance** : Le script utilise des requêtes séquentielles pour assurer la cohérence. Pour une meilleure performance, on pourrait utiliser des transactions et des batch inserts.

4. **Logs** : Le script affiche sa progression en temps réel. Surveillez la console pour voir l'avancement.

## 🐛 Dépannage

### Erreur : "DATABASE_URL environment variable is required"
➜ Vérifiez que `.env.local` existe et contient `DATABASE_URL`

### Erreur : "Cannot find module 'tsx'"
➜ Installez les dépendances : `npm install --save-dev tsx`

### Erreur : "relation does not exist"
➜ Vérifiez que toutes les tables existent dans la base. Lancez les migrations d'abord.

### Le script est très lent
➜ Normal, il génère ~1000+ lignes de données. Patience !

### Erreur de contrainte unique sur email
➜ Des joueurs avec ces emails existent déjà. Nettoyez la base ou modifiez le script pour vérifier les doublons.

## 📈 Après le Seed

Une fois le script exécuté avec succès, vous pouvez :

1. **Tester la Home Page** : Les KPIs devraient afficher des données réalistes
2. **Tester les Classements** : Voir les meilleurs joueurs et paires
3. **Naviguer dans les Tournois** : Voir les résultats historiques
4. **Tester les Stats** : Vérifier les séries de victoires, remontées, etc.

Profitez de votre base de données remplie ! 🎾
