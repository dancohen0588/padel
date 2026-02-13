/**
 * Script de nettoyage de la base de données
 * Supprime toutes les données des tables en respectant les contraintes de clés étrangères
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Variable d\'environnement DATABASE_URL non définie');
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function cleanDatabase() {
  console.log('🧹 Nettoyage de la base de données...');

  try {
    // Supprimer les données dans l'ordre inverse des dépendances
    // Utilise DELETE FROM au lieu de TRUNCATE pour éviter les problèmes de permissions
    console.log('   • Suppression des données des tables...');

    // Tables de détails des matchs (feuilles)
    await sql`DELETE FROM playoff_sets`;
    await sql`DELETE FROM match_sets`;

    // Tables de matchs
    await sql`DELETE FROM playoff_matches`;
    await sql`DELETE FROM matches`;

    // Tables intermédiaires
    await sql`DELETE FROM playoff_rounds`;
    await sql`DELETE FROM pool_teams`;
    await sql`DELETE FROM pools`;
    await sql`DELETE FROM team_players`;
    await sql`DELETE FROM teams`;
    await sql`DELETE FROM registrations`;

    // Tables principales
    await sql`DELETE FROM tournaments`;
    await sql`DELETE FROM players`;

    console.log('✅ Base de données nettoyée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

cleanDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
