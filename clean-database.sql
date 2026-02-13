-- Script de nettoyage de la base de données
-- ATTENTION : Supprime toutes les données des tables !

-- Désactiver temporairement les contraintes de clés étrangères
SET session_replication_role = 'replica';

-- Supprimer les données dans l'ordre inverse des dépendances
TRUNCATE TABLE match_sets CASCADE;
TRUNCATE TABLE playoff_sets CASCADE;
TRUNCATE TABLE playoff_matches CASCADE;
TRUNCATE TABLE playoff_rounds CASCADE;
TRUNCATE TABLE matches CASCADE;
TRUNCATE TABLE pool_teams CASCADE;
TRUNCATE TABLE pools CASCADE;
TRUNCATE TABLE team_players CASCADE;
TRUNCATE TABLE teams CASCADE;
TRUNCATE TABLE registrations CASCADE;
TRUNCATE TABLE players CASCADE;
TRUNCATE TABLE tournament_photos CASCADE;
TRUNCATE TABLE tournaments CASCADE;
TRUNCATE TABLE home_gallery CASCADE;
TRUNCATE TABLE home_config CASCADE;

-- Réactiver les contraintes
SET session_replication_role = 'origin';

-- Afficher le résultat
SELECT 'Base de données nettoyée avec succès !' as message;
