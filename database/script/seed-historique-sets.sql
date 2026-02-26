-- ============================================================
-- Seed : Sets des tournois historiques
-- Règles de rattrappage :
--   • Matchs de poule  (table matches)         → 1 set  par match
--   • Finales / phases éliminatoires           → 2 sets par match
--                   (tables playoff_matches + playoff_sets)
-- Scores placeholder : 6-4 (set 1) et 6-3 (set 2) — le vainqueur
--   étant toujours team1/team_a dans nos données historiques.
--
-- ⚠️  Ce script ne touche QUE les tournois historiques
--     (slug LIKE 'historique-%'). Les tournois réels ne sont
--     pas affectés.
--
-- KPIs impactés :
--   • Sets (home)  → count(*) FROM match_sets   (+616 lignes)
--   • Les playoff_sets permettront aussi au KPI
--     "Closest Match" de fonctionner sur les finales.
--
-- Idempotent : ON CONFLICT DO NOTHING sur les contraintes UNIQUE
--   (match_id, set_order) et (match_id, set_number).
-- ============================================================

DO $$
DECLARE
  v_match_sets_inserted   int;
  v_playoff_sets_inserted int;
BEGIN

  -- ============================================================
  -- 1. MATCH_SETS — matchs de poule : 1 set par match
  --    Scores placeholder : team_a_games = 6, team_b_games = 4
  --    (winner_team_id est NULL sur ces matchs historiques,
  --     le score exact n'a pas d'incidence sur les KPIs)
  -- ============================================================
  INSERT INTO match_sets (match_id, set_order, team_a_games, team_b_games)
  SELECT
    m.id,
    1 AS set_order,
    6 AS team_a_games,
    4 AS team_b_games
  FROM matches m
  JOIN tournaments t ON t.id = m.tournament_id
  WHERE t.slug LIKE 'historique-%'
    AND m.status = 'finished'
  ON CONFLICT (match_id, set_order) DO NOTHING;

  GET DIAGNOSTICS v_match_sets_inserted = ROW_COUNT;

  -- ============================================================
  -- 2. PLAYOFF_SETS — finales : 2 sets par match
  --    Set 1 : 6-4  (team1 = vainqueur dans toutes les finales)
  --    Set 2 : 6-3
  -- ============================================================
  INSERT INTO playoff_sets (match_id, set_number, team1_score, team2_score)
  SELECT
    pm.id,
    gs.n   AS set_number,
    CASE gs.n WHEN 1 THEN 6 ELSE 6 END AS team1_score,
    CASE gs.n WHEN 1 THEN 4 ELSE 3 END AS team2_score
  FROM playoff_matches pm
  JOIN playoff_rounds  pr ON pr.id = pm.round_id
  JOIN tournaments      t ON t.id  = pr.tournament_id
  CROSS JOIN (VALUES (1), (2)) AS gs(n)
  WHERE t.slug LIKE 'historique-%'
    AND pm.winner_id IS NOT NULL
  ON CONFLICT (match_id, set_number) DO NOTHING;

  GET DIAGNOSTICS v_playoff_sets_inserted = ROW_COUNT;

  RAISE NOTICE '✅ Sets historiques insérés — match_sets : %, playoff_sets : %',
    v_match_sets_inserted,
    v_playoff_sets_inserted;

END $$;
