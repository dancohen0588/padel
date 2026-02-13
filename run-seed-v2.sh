#!/bin/bash

echo "🎾 Le Tournoi des Frérots - Script de Seed v2"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Charger les variables d'environnement depuis .env.local
if [ -f .env.local ]; then
  export $(cat .env.local | xargs)
fi

# Vérifier que DATABASE_URL existe
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Erreur : DATABASE_URL non trouvée"
  echo "   Créez un fichier .env.local avec DATABASE_URL=..."
  exit 1
fi

# Vérifier les dépendances
echo "📦 Vérification des dépendances..."
if ! npm list tsx > /dev/null 2>&1; then
  echo "   Installation de tsx..."
  npm install --save-dev tsx
  echo "   ✓ tsx installé"
else
  echo "   ✓ Dépendances déjà installées"
fi

echo ""
echo "⚠️  ATTENTION : Ce script va générer des données dans votre base"
echo "   - 100 joueurs"
echo "   - 10 tournois"
echo "   - ~200-250 équipes"
echo "   - ~1500-2000 matchs"
echo ""
echo "📋 Options :"
echo "   1. Nettoyer la base ET générer de nouvelles données"
echo "   2. Générer des données sans nettoyer (ajoute aux données existantes)"
echo "   3. Annuler"
echo ""
read -p "Votre choix (1/2/3) : " -n 1 -r
echo ""

if [[ $REPLY == "3" ]] || [[ ! $REPLY =~ ^[12]$ ]]; then
  echo "❌ Annulé"
  exit 0
fi

if [[ $REPLY == "1" ]]; then
  echo ""
  echo "🧹 Nettoyage de la base de données..."
  npx tsx clean-database.ts

  if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du nettoyage"
    exit 1
  fi

  echo "✅ Base nettoyée"
fi

echo ""
echo "🚀 Lancement du seed..."
echo ""

npx tsx seed-database-v2.ts

if [ $? -eq 0 ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ Seed terminé avec succès !"
  echo ""
  echo "🎉 Votre base de données contient maintenant :"
  echo "   • 100 joueurs avec noms français réels"
  echo "   • 10 tournois sur 2 ans"
  echo "   • Des centaines de matchs avec résultats réalistes"
  echo ""
  echo "🔗 Testez l'application :"
  echo "   http://localhost:3000/"
  echo ""
else
  echo ""
  echo "❌ Erreur lors du seed"
  echo "   Consultez les logs ci-dessus pour plus de détails"
  exit 1
fi
