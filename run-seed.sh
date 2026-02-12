#!/bin/bash

echo "🎾 Le Tournoi des Frérots - Script de Seed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Vérifier que DATABASE_URL existe
if [ -z "$DATABASE_URL" ] && [ ! -f .env.local ]; then
  echo "❌ Erreur : DATABASE_URL non trouvée"
  echo "   Créez un fichier .env.local avec DATABASE_URL=..."
  exit 1
fi

# Charger les variables d'environnement depuis .env.local
if [ -f .env.local ]; then
  export $(cat .env.local | xargs)
fi

# Vérifier les dépendances
echo "📦 Vérification des dépendances..."
if ! npm list tsx @neondatabase/serverless ws @types/ws > /dev/null 2>&1; then
  echo "   Installation des dépendances manquantes..."
  npm install --save-dev tsx @neondatabase/serverless ws @types/ws
  echo "   ✓ Dépendances installées"
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
read -p "Continuer ? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Annulé"
  exit 0
fi

echo ""
echo "🚀 Lancement du seed..."
echo ""

npx tsx seed-database.ts

if [ $? -eq 0 ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ Seed terminé avec succès !"
  echo ""
  echo "🎉 Votre base de données est maintenant remplie avec :"
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
