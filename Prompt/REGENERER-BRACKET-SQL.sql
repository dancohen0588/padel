-- Script SQL pour régénérer le bracket du tournoi test-4

-- 1. Supprimer le bracket existant
DELETE FROM playoff_sets
WHERE match_id IN (
  SELECT pm.id
  FROM playoff_matches pm
  JOIN tournaments t ON t.id = pm.tournament_id
  WHERE t.slug = 'test-4'
);

DELETE FROM playoff_matches
WHERE tournament_id IN (
  SELECT id FROM tournaments WHERE slug = 'test-4'
);

DELETE FROM playoff_rounds
WHERE tournament_id IN (
  SELECT id FROM tournaments WHERE slug = 'test-4'
);

-- 2. Vérifier la configuration (doit afficher teams_qualified: 8)
SELECT
  slug,
  config->'playoffs'->'teams_qualified' as teams_qualified,
  config->'playoffs'->'enabled' as playoffs_enabled
FROM tournaments
WHERE slug = 'test-4';

-- Si teams_qualified n'est pas 8, le corriger :
-- UPDATE tournaments
-- SET config = jsonb_set(config, '{playoffs,teams_qualified}', '8', true)
-- WHERE slug = 'test-4';

-- 3. Après exécution de ce script, retourne dans l'interface admin
-- et clique sur "Générer le bracket" ou recharge la page
-- pour que generateEmptyPlayoffBracket() soit appelé automatiquement
