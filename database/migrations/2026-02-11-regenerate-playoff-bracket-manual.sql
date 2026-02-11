-- Script manuel de régénération des playoffs pour un tournoi donné.
-- Remplacer TOURNAMENT_ID par un UUID réel (garder les quotes). Exemple :
-- select id from tournaments where name = 'Test 4';
-- puis remplacer 'TOURNAMENT_ID' par '89db4852-9b71-4e60-ac23-836d7195f904'.

-- 1) Purge des sets puis des matchs puis des rounds
delete from playoff_sets
where match_id in (
  select id from playoff_matches where tournament_id = 'test-4'
);

delete from playoff_matches where tournament_id = 'test-4';

delete from playoff_rounds where tournament_id = 'Test 4';

-- 2) Regénération via l'interface admin (bouton créer/mettre à jour du tournoi)
--    ou via action serveur generateEmptyPlayoffBracket().
