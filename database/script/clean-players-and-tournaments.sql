-- ============================================================
-- Script de nettoyage : joueurs + tournois uniquement
-- ATTENTION : suppression irréversible !
-- Préserve : home_gallery, home_config, payment_config, admins
-- ============================================================

SET session_replication_role = 'replica';

-- Phases finales
TRUNCATE TABLE playoff_sets     CASCADE;
TRUNCATE TABLE playoff_matches  CASCADE;
TRUNCATE TABLE playoff_rounds   CASCADE;

-- Matchs de poules
TRUNCATE TABLE match_sets       CASCADE;
TRUNCATE TABLE matches          CASCADE;

-- Poules
TRUNCATE TABLE pool_teams       CASCADE;
TRUNCATE TABLE pools            CASCADE;

-- Équipes & joueurs
TRUNCATE TABLE team_players     CASCADE;
TRUNCATE TABLE teams            CASCADE;
TRUNCATE TABLE registrations    CASCADE;
TRUNCATE TABLE tournament_photos CASCADE;
TRUNCATE TABLE players          CASCADE;

-- Tournois
TRUNCATE TABLE tournaments      CASCADE;

SET session_replication_role = 'origin';

SELECT 'Joueurs et tournois supprimés avec succès.' AS message;
