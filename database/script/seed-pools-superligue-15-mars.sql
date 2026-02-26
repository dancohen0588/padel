-- ============================================================
-- Seed : Répartition des poules — Superligue 15 mars
-- 5 poules × 5 équipes
-- ============================================================

DO $$
DECLARE
  v_tid uuid;
  p_a   uuid;
  p_b   uuid;
  p_c   uuid;
  p_d   uuid;
  p_e   uuid;

BEGIN

  -- ============================================================
  -- 1. Tournoi
  -- ============================================================
  SELECT id INTO v_tid FROM tournaments WHERE slug = 'superligue-15-mars';
  IF v_tid IS NULL THEN
    RAISE EXCEPTION 'Tournoi "superligue-15-mars" introuvable';
  END IF;

  -- ============================================================
  -- 2. Créer les poules si elles n'existent pas encore
  -- ============================================================
  SELECT id INTO p_a FROM pools WHERE tournament_id = v_tid AND name = 'Poule A' LIMIT 1;
  IF p_a IS NULL THEN
    INSERT INTO pools (tournament_id, name, pool_order) VALUES (v_tid, 'Poule A', 1) RETURNING id INTO p_a;
  END IF;

  SELECT id INTO p_b FROM pools WHERE tournament_id = v_tid AND name = 'Poule B' LIMIT 1;
  IF p_b IS NULL THEN
    INSERT INTO pools (tournament_id, name, pool_order) VALUES (v_tid, 'Poule B', 2) RETURNING id INTO p_b;
  END IF;

  SELECT id INTO p_c FROM pools WHERE tournament_id = v_tid AND name = 'Poule C' LIMIT 1;
  IF p_c IS NULL THEN
    INSERT INTO pools (tournament_id, name, pool_order) VALUES (v_tid, 'Poule C', 3) RETURNING id INTO p_c;
  END IF;

  SELECT id INTO p_d FROM pools WHERE tournament_id = v_tid AND name = 'Poule D' LIMIT 1;
  IF p_d IS NULL THEN
    INSERT INTO pools (tournament_id, name, pool_order) VALUES (v_tid, 'Poule D', 4) RETURNING id INTO p_d;
  END IF;

  SELECT id INTO p_e FROM pools WHERE tournament_id = v_tid AND name = 'Poule E' LIMIT 1;
  IF p_e IS NULL THEN
    INSERT INTO pools (tournament_id, name, pool_order) VALUES (v_tid, 'Poule E', 5) RETURNING id INTO p_e;
  END IF;

  -- ============================================================
  -- 3. Vider les affectations existantes
  -- ============================================================
  DELETE FROM pool_teams WHERE pool_id IN (p_a, p_b, p_c, p_d, p_e);

  -- ============================================================
  -- 4. Affecter les équipes
  -- ============================================================

  -- Poule A
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_a, id FROM teams WHERE tournament_id = v_tid AND name = 'Mezrahi / Hackoun';
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_a, id FROM teams WHERE tournament_id = v_tid AND name = 'Sala / Bismuth';
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_a, id FROM teams WHERE tournament_id = v_tid AND name = 'Benjoar / Sarfati';
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_a, id FROM teams WHERE tournament_id = v_tid AND name = 'Ayman / Sebag';
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_a, id FROM teams WHERE tournament_id = v_tid AND name = 'M.Zribi / J.Zribi';

  -- Poule B
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_b, id FROM teams WHERE tournament_id = v_tid AND name = 'Amar / Seknadje';
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_b, id FROM teams WHERE tournament_id = v_tid AND name = 'Bajczman / Medard';
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_b, id FROM teams WHERE tournament_id = v_tid AND name = 'E.Giami / Slama';
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_b, id FROM teams WHERE tournament_id = v_tid AND name = 'Aboujed / Rose';
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_b, id FROM teams WHERE tournament_id = v_tid AND name = 'Benisty / Guenik';

  -- Poule C
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_c, id FROM teams WHERE tournament_id = v_tid AND name = 'B.Giami / Toledano';
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_c, id FROM teams WHERE tournament_id = v_tid AND name = 'Hazout / Marrache';
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_c, id FROM teams WHERE tournament_id = v_tid AND name = 'Bedjai / Ouhioun';
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_c, id FROM teams WHERE tournament_id = v_tid AND name = 'A.Cohen / Fitussi';
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_c, id FROM teams WHERE tournament_id = v_tid AND name = 'Azerraf / Botbol';

  -- Poule D
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_d, id FROM teams WHERE tournament_id = v_tid AND name = 'Mendelson / Boccara';
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_d, id FROM teams WHERE tournament_id = v_tid AND name = 'Benmoussa / Gitton';
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_d, id FROM teams WHERE tournament_id = v_tid AND name = 'Sabban / Cattan';
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_d, id FROM teams WHERE tournament_id = v_tid AND name = 'Nataf / Chiche';
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_d, id FROM teams WHERE tournament_id = v_tid AND name = 'Arditti / Fellous';

  -- Poule E
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_e, id FROM teams WHERE tournament_id = v_tid AND name = 'Narboni / Nahmias';
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_e, id FROM teams WHERE tournament_id = v_tid AND name = 'R.Namias / J.Namias';
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_e, id FROM teams WHERE tournament_id = v_tid AND name = 'Noblinski / Zerbib';
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_e, id FROM teams WHERE tournament_id = v_tid AND name = 'B.Cohen / Lévy';
  INSERT INTO pool_teams (pool_id, team_id) SELECT p_e, id FROM teams WHERE tournament_id = v_tid AND name = 'F.Berrebi / E.Berrebi';

  RAISE NOTICE 'OK : 5 poules × 5 équipes assignées pour le tournoi %.', v_tid;

END $$;
