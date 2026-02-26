-- ============================================================
-- Seed : Historique des tournois — données de finales
-- 10 tournois "version à 20" + 1 tournoi "version à 50"
-- ============================================================
-- Ce script est IDEMPOTENT : relancé, il ne crée pas de doublons.
--
-- KPIs alimentés :
--   • Nombre de tournois         → count(*) FROM tournaments
--   • Nombre de matchs joués     → count(*) FROM matches WHERE status = 'finished'
--                                   55 matchs/tournoi pour v20, 66 pour v50
--   • Derniers champions         → playoff_matches avec winner_id sur le round "Finale"
--
-- KPIs laissés vides (non alimentés par ce script) :
--   • Joueurs actifs   → registrations (pas créées pour les historiques)
--   • Sets             → match_sets    (pas créés pour les historiques)
--   • Top Teams / Top Players / Closest Match → non peuplés volontairement
--
-- ⚠️  Numéros placeholder (pas de téléphone connu) :
--   • Zack Sabban          → 0000000101
--   • David Ghouzi         → 0000000102
--   • Jordan Hadjez        → 0000000103
--   • Lionel Sebbag        → 0000000104
--   • Jonathan Amzelek     → 0000000105
--   • Alex (T08)           → 0000000106
--   • Jonas Nataf          → 0000000107
--   • Sasha Benichou       → 0000000108
--   • Nico Berdugo         → 0000000109
--   • Cedric (T10)         → 0000000110
--   • David Chiche         → 0000000111
-- ============================================================

DO $$
DECLARE
  -- ── Tournois ───────────────────────────────────────────────
  t01_id uuid; t02_id uuid; t03_id uuid; t04_id uuid; t05_id uuid;
  t06_id uuid; t07_id uuid; t08_id uuid; t09_id uuid; t10_id uuid;
  t11_id uuid;

  -- ── Joueurs ────────────────────────────────────────────────
  p_nahmias_daniel        uuid;
  p_zagury_victor         uuid;
  p_gitton_harold         uuid;
  p_azerraf_albert        uuid;
  p_benmoussa_lionel      uuid;
  p_aymant_gary           uuid;
  p_bismuth_david         uuid;
  p_amar_charles          uuid;
  p_sabban_zack           uuid;
  p_stora_bryan           uuid;
  p_bajczman_ruben        uuid;
  p_ghouzi_david          uuid;
  p_hadjez_jordan         uuid;
  p_hazout_victor         uuid;
  p_marrache_david        uuid;
  p_giami_benjamin        uuid;
  p_toledano_ewan         uuid;
  p_zeitoun_jeremie       uuid;
  p_zeitoun_david         uuid;
  p_noblinski             uuid;
  p_sebbag_lionel         uuid;
  p_amzelek_jonathan      uuid;
  p_mendelson_benjamin    uuid;
  p_william               uuid;
  p_alex                  uuid;
  p_nataf_jonas           uuid;
  p_benichou_sasha        uuid;
  p_bretonniere_benjamin  uuid;
  p_berdugo_nico          uuid;
  p_mezrahi_arnaud        uuid;
  p_cedric                uuid;
  p_berrebi_franck        uuid;
  p_chiche_david          uuid;

  -- ── Équipes (w = vainqueurs, f = finalistes) ───────────────
  t01_w uuid; t01_f uuid;
  t02_w uuid; t02_f uuid;
  t03_w uuid; t03_f uuid;
  t04_w uuid; t04_f uuid;
  t05_w uuid; t05_f uuid;
  t06_w uuid; t06_f uuid;
  t07_w uuid; t07_f uuid;
  t08_w uuid; t08_f uuid;
  t09_w uuid; t09_f uuid;
  t10_w uuid; t10_f uuid;
  t11_w uuid; t11_f uuid;

  -- ── Playoff rounds ─────────────────────────────────────────
  r01 uuid; r02 uuid; r03 uuid; r04 uuid; r05 uuid;
  r06 uuid; r07 uuid; r08 uuid; r09 uuid; r10 uuid;
  r11 uuid;

BEGIN

  -- ============================================================
  -- 1. JOUEURS — upsert via téléphone normalisé
  --    ON CONFLICT : retourne l'id existant et met à jour le prénom
  -- ============================================================

  -- Joueurs avec téléphone réel
  INSERT INTO players (first_name, last_name, phone) VALUES ('Daniel',    'Nahmias',           '0663471851')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_nahmias_daniel;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Victor',    'Zagury',            '0658006831')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_zagury_victor;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Harold',    'Gitton',            '0621215986')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_gitton_harold;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Albert',    'Azerraf',           '0661119836')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_azerraf_albert;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Lionel',    'Benmoussa',         '0610393090')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_benmoussa_lionel;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Gary',      'Aymant',            '0667610294')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_aymant_gary;

  INSERT INTO players (first_name, last_name, phone) VALUES ('David',     'Bismuth',           '0611810990')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_bismuth_david;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Charles',   'Amar',              '0620546862')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_amar_charles;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Bryan',     'Stora',             '0620037674')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_stora_bryan;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Ruben',     'Bajczman',          '0611862667')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_bajczman_ruben;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Victor',    'Hazout',            '0620191828')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_hazout_victor;

  INSERT INTO players (first_name, last_name, phone) VALUES ('David',     'Marrache',          '0619922943')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_marrache_david;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Benjamin',  'Giami',             '0623194578')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_giami_benjamin;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Ewan',      'Toledano',          '0603779521')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_toledano_ewan;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Jérémie',   'Zeitoun',           '0658860521')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_zeitoun_jeremie;

  INSERT INTO players (first_name, last_name, phone) VALUES ('David',     'Zeitoun',           '0618777180')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_zeitoun_david;

  -- Noblinski (T07) — numéro différent de celui du superligue (Matias Noblinski '0687778147')
  INSERT INTO players (first_name, last_name, phone) VALUES ('',          'Noblinski',         '0616333196')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET last_name = EXCLUDED.last_name
    RETURNING id INTO p_noblinski;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Benjamin',  'Mendelson',         '0761017989')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_mendelson_benjamin;

  -- William — prénom uniquement
  INSERT INTO players (first_name, last_name, phone) VALUES ('William',   '',                  '0686035688')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_william;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Benjamin',  'de la Bretonniere', '0603430252')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_bretonniere_benjamin;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Arnaud',    'Mezrahi',           '0660876153')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_mezrahi_arnaud;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Franck',    'Berrebi',           '0628804146')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_berrebi_franck;

  -- Joueurs sans téléphone — numéros placeholder (0000000101–0000000111)
  INSERT INTO players (first_name, last_name, phone) VALUES ('Zack',      'Sabban',            '0000000101')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_sabban_zack;

  INSERT INTO players (first_name, last_name, phone) VALUES ('David',     'Ghouzi',            '0000000102')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_ghouzi_david;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Jordan',    'Hadjez',            '0000000103')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_hadjez_jordan;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Lionel',    'Sebbag',            '0000000104')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_sebbag_lionel;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Jonathan',  'Amzelek',           '0000000105')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_amzelek_jonathan;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Alex',      '',                  '0000000106')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_alex;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Jonas',     'Nataf',             '0000000107')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_nataf_jonas;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Sasha',     'Benichou',          '0000000108')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_benichou_sasha;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Nico',      'Berdugo',           '0000000109')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_berdugo_nico;

  INSERT INTO players (first_name, last_name, phone) VALUES ('Cedric',    '',                  '0000000110')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_cedric;

  INSERT INTO players (first_name, last_name, phone) VALUES ('David',     'Chiche',            '0000000111')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p_chiche_david;

  -- ============================================================
  -- 2. TOURNOIS — upsert via slug
  --    Config minimale historique. max_players = nb joueurs (2 par équipe).
  -- ============================================================

  INSERT INTO tournaments (slug, name, date, status, max_players, config)
  VALUES (
    'historique-mars-2024',
    'Tournoi des Frérots #1 — Mars 2024',
    '2024-03-10',
    'archived',
    40,
    '{"pairing_mode":"balanced","pools_count":4,"playoffs":{"enabled":true,"teams_qualified":4,"format":"single_elim","has_third_place":false}}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET status = 'archived'
  RETURNING id INTO t01_id;

  INSERT INTO tournaments (slug, name, date, status, max_players, config)
  VALUES (
    'historique-juin-2024',
    'Tournoi des Frérots #2 — Juin 2024',
    '2024-06-01',
    'archived',
    40,
    '{"pairing_mode":"balanced","pools_count":4,"playoffs":{"enabled":true,"teams_qualified":4,"format":"single_elim","has_third_place":false}}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET status = 'archived'
  RETURNING id INTO t02_id;

  INSERT INTO tournaments (slug, name, date, status, max_players, config)
  VALUES (
    'historique-oct-2024',
    'Tournoi des Frérots #3 — Oct. 2024',
    '2024-10-01',
    'archived',
    40,
    '{"pairing_mode":"balanced","pools_count":4,"playoffs":{"enabled":true,"teams_qualified":4,"format":"single_elim","has_third_place":false}}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET status = 'archived'
  RETURNING id INTO t03_id;

  -- Deux tournois en décembre 2024 — dates espacées
  INSERT INTO tournaments (slug, name, date, status, max_players, config)
  VALUES (
    'historique-dec-2024-1',
    'Tournoi des Frérots #4 — Déc. 2024',
    '2024-12-07',
    'archived',
    40,
    '{"pairing_mode":"balanced","pools_count":4,"playoffs":{"enabled":true,"teams_qualified":4,"format":"single_elim","has_third_place":false}}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET status = 'archived'
  RETURNING id INTO t04_id;

  INSERT INTO tournaments (slug, name, date, status, max_players, config)
  VALUES (
    'historique-dec-2024-2',
    'Tournoi des Frérots #5 — Déc. 2024',
    '2024-12-21',
    'archived',
    40,
    '{"pairing_mode":"balanced","pools_count":4,"playoffs":{"enabled":true,"teams_qualified":4,"format":"single_elim","has_third_place":false}}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET status = 'archived'
  RETURNING id INTO t05_id;

  INSERT INTO tournaments (slug, name, date, status, max_players, config)
  VALUES (
    'historique-jan-2025',
    'Tournoi des Frérots #6 — Jan. 2025',
    '2025-01-01',
    'archived',
    40,
    '{"pairing_mode":"balanced","pools_count":4,"playoffs":{"enabled":true,"teams_qualified":4,"format":"single_elim","has_third_place":false}}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET status = 'archived'
  RETURNING id INTO t06_id;

  INSERT INTO tournaments (slug, name, date, status, max_players, config)
  VALUES (
    'historique-mars-2025',
    'Tournoi des Frérots #7 — Mars 2025',
    '2025-03-01',
    'archived',
    40,
    '{"pairing_mode":"balanced","pools_count":4,"playoffs":{"enabled":true,"teams_qualified":4,"format":"single_elim","has_third_place":false}}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET status = 'archived'
  RETURNING id INTO t07_id;

  INSERT INTO tournaments (slug, name, date, status, max_players, config)
  VALUES (
    'historique-avr-2025',
    'Tournoi des Frérots #8 — Avr. 2025',
    '2025-04-01',
    'archived',
    40,
    '{"pairing_mode":"balanced","pools_count":4,"playoffs":{"enabled":true,"teams_qualified":4,"format":"single_elim","has_third_place":false}}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET status = 'archived'
  RETURNING id INTO t08_id;

  INSERT INTO tournaments (slug, name, date, status, max_players, config)
  VALUES (
    'historique-juin-2025',
    'Tournoi des Frérots #9 — Juin 2025',
    '2025-06-01',
    'archived',
    40,
    '{"pairing_mode":"balanced","pools_count":4,"playoffs":{"enabled":true,"teams_qualified":4,"format":"single_elim","has_third_place":false}}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET status = 'archived'
  RETURNING id INTO t09_id;

  INSERT INTO tournaments (slug, name, date, status, max_players, config)
  VALUES (
    'historique-dec-2025',
    'Tournoi des Frérots #10 — Déc. 2025',
    '2025-12-01',
    'archived',
    40,
    '{"pairing_mode":"balanced","pools_count":4,"playoffs":{"enabled":true,"teams_qualified":4,"format":"single_elim","has_third_place":false}}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET status = 'archived'
  RETURNING id INTO t10_id;

  -- Tournoi version à 50 joueurs (25 équipes)
  INSERT INTO tournaments (slug, name, date, status, max_players, config)
  VALUES (
    'historique-jan-2026',
    'Tournoi des Frérots Superligue — Jan. 2026',
    '2026-01-01',
    'archived',
    50,
    '{"pairing_mode":"balanced","pools_count":5,"playoffs":{"enabled":true,"teams_qualified":10,"format":"single_elim","has_third_place":false}}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET status = 'archived'
  RETURNING id INTO t11_id;

  -- ============================================================
  -- 3. ÉQUIPES — check existence avant insertion
  -- ============================================================

  -- T01 : Daniel Nahmias / Victor Zagury vs Harold Gitton / Albert Azerraf
  SELECT id INTO t01_w FROM teams WHERE tournament_id = t01_id AND name = 'Nahmias / Zagury' LIMIT 1;
  IF t01_w IS NULL THEN
    INSERT INTO teams (tournament_id, name) VALUES (t01_id, 'Nahmias / Zagury') RETURNING id INTO t01_w;
  END IF;
  SELECT id INTO t01_f FROM teams WHERE tournament_id = t01_id AND name = 'Gitton / Azerraf' LIMIT 1;
  IF t01_f IS NULL THEN
    INSERT INTO teams (tournament_id, name) VALUES (t01_id, 'Gitton / Azerraf') RETURNING id INTO t01_f;
  END IF;

  -- T02 : Harold Gitton / Albert Azerraf vs Lionel Benmoussa / Gary Aymant
  SELECT id INTO t02_w FROM teams WHERE tournament_id = t02_id AND name = 'Gitton / Azerraf' LIMIT 1;
  IF t02_w IS NULL THEN
    INSERT INTO teams (tournament_id, name) VALUES (t02_id, 'Gitton / Azerraf') RETURNING id INTO t02_w;
  END IF;
  SELECT id INTO t02_f FROM teams WHERE tournament_id = t02_id AND name = 'Benmoussa / Aymant' LIMIT 1;
  IF t02_f IS NULL THEN
    INSERT INTO teams (tournament_id, name) VALUES (t02_id, 'Benmoussa / Aymant') RETURNING id INTO t02_f;
  END IF;

  -- T03 : David Bismuth / Charles Amar vs Harold Gitton / Zack Sabban
  SELECT id INTO t03_w FROM teams WHERE tournament_id = t03_id AND name = 'Bismuth / Amar' LIMIT 1;
  IF t03_w IS NULL THEN
    INSERT INTO teams (tournament_id, name) VALUES (t03_id, 'Bismuth / Amar') RETURNING id INTO t03_w;
  END IF;
  SELECT id INTO t03_f FROM teams WHERE tournament_id = t03_id AND name = 'Gitton / Sabban' LIMIT 1;
  IF t03_f IS NULL THEN
    INSERT INTO teams (tournament_id, name) VALUES (t03_id, 'Gitton / Sabban') RETURNING id INTO t03_f;
  END IF;

  -- T04 : Bryan Stora / Ruben Bajczman vs David Ghouzi / Jordan Hadjez
  SELECT id INTO t04_w FROM teams WHERE tournament_id = t04_id AND name = 'Stora / Bajczman' LIMIT 1;
  IF t04_w IS NULL THEN
    INSERT INTO teams (tournament_id, name) VALUES (t04_id, 'Stora / Bajczman') RETURNING id INTO t04_w;
  END IF;
  SELECT id INTO t04_f FROM teams WHERE tournament_id = t04_id AND name = 'Ghouzi / Hadjez' LIMIT 1;
  IF t04_f IS NULL THEN
    INSERT INTO teams (tournament_id, name) VALUES (t04_id, 'Ghouzi / Hadjez') RETURNING id INTO t04_f;
  END IF;

  -- T05 : Victor Hazout / David Marrache vs Harold Gitton / Charles Amar
  SELECT id INTO t05_w FROM teams WHERE tournament_id = t05_id AND name = 'Hazout / Marrache' LIMIT 1;
  IF t05_w IS NULL THEN
    INSERT INTO teams (tournament_id, name) VALUES (t05_id, 'Hazout / Marrache') RETURNING id INTO t05_w;
  END IF;
  SELECT id INTO t05_f FROM teams WHERE tournament_id = t05_id AND name = 'Gitton / Amar' LIMIT 1;
  IF t05_f IS NULL THEN
    INSERT INTO teams (tournament_id, name) VALUES (t05_id, 'Gitton / Amar') RETURNING id INTO t05_f;
  END IF;

  -- T06 : Benjamin Giami / Ewan Toledano vs Daniel Nahmias / Jérémie Zeitoun
  SELECT id INTO t06_w FROM teams WHERE tournament_id = t06_id AND name = 'Giami / Toledano' LIMIT 1;
  IF t06_w IS NULL THEN
    INSERT INTO teams (tournament_id, name) VALUES (t06_id, 'Giami / Toledano') RETURNING id INTO t06_w;
  END IF;
  SELECT id INTO t06_f FROM teams WHERE tournament_id = t06_id AND name = 'Nahmias / Zeitoun' LIMIT 1;
  IF t06_f IS NULL THEN
    INSERT INTO teams (tournament_id, name) VALUES (t06_id, 'Nahmias / Zeitoun') RETURNING id INTO t06_f;
  END IF;

  -- T07 : David Zeitoun / Noblinski vs Lionel Sebbag / Jonathan Amzelek
  SELECT id INTO t07_w FROM teams WHERE tournament_id = t07_id AND name = 'Zeitoun / Noblinski' LIMIT 1;
  IF t07_w IS NULL THEN
    INSERT INTO teams (tournament_id, name) VALUES (t07_id, 'Zeitoun / Noblinski') RETURNING id INTO t07_w;
  END IF;
  SELECT id INTO t07_f FROM teams WHERE tournament_id = t07_id AND name = 'Sebbag / Amzelek' LIMIT 1;
  IF t07_f IS NULL THEN
    INSERT INTO teams (tournament_id, name) VALUES (t07_id, 'Sebbag / Amzelek') RETURNING id INTO t07_f;
  END IF;

  -- T08 : Ben Mendelson / William vs Harold Gitton / Alex
  SELECT id INTO t08_w FROM teams WHERE tournament_id = t08_id AND name = 'Mendelson / William' LIMIT 1;
  IF t08_w IS NULL THEN
    INSERT INTO teams (tournament_id, name) VALUES (t08_id, 'Mendelson / William') RETURNING id INTO t08_w;
  END IF;
  SELECT id INTO t08_f FROM teams WHERE tournament_id = t08_id AND name = 'Gitton / Alex' LIMIT 1;
  IF t08_f IS NULL THEN
    INSERT INTO teams (tournament_id, name) VALUES (t08_id, 'Gitton / Alex') RETURNING id INTO t08_f;
  END IF;

  -- T09 : Daniel Nahmias / Jérémie Zeitoun vs Jonas Nataf / Sasha Benichou
  SELECT id INTO t09_w FROM teams WHERE tournament_id = t09_id AND name = 'Nahmias / Zeitoun' LIMIT 1;
  IF t09_w IS NULL THEN
    INSERT INTO teams (tournament_id, name) VALUES (t09_id, 'Nahmias / Zeitoun') RETURNING id INTO t09_w;
  END IF;
  SELECT id INTO t09_f FROM teams WHERE tournament_id = t09_id AND name = 'Nataf / Benichou' LIMIT 1;
  IF t09_f IS NULL THEN
    INSERT INTO teams (tournament_id, name) VALUES (t09_id, 'Nataf / Benichou') RETURNING id INTO t09_f;
  END IF;

  -- T10 : Benjamin de la Bretonniere / Nico Berdugo vs Arnaud Mezrahi / Cedric
  SELECT id INTO t10_w FROM teams WHERE tournament_id = t10_id AND name = 'Bretonniere / Berdugo' LIMIT 1;
  IF t10_w IS NULL THEN
    INSERT INTO teams (tournament_id, name) VALUES (t10_id, 'Bretonniere / Berdugo') RETURNING id INTO t10_w;
  END IF;
  SELECT id INTO t10_f FROM teams WHERE tournament_id = t10_id AND name = 'Mezrahi / Cedric' LIMIT 1;
  IF t10_f IS NULL THEN
    INSERT INTO teams (tournament_id, name) VALUES (t10_id, 'Mezrahi / Cedric') RETURNING id INTO t10_f;
  END IF;

  -- T11 : Arnaud Mezrahi / Franck Berrebi vs Jonas Nataf / David Chiche
  SELECT id INTO t11_w FROM teams WHERE tournament_id = t11_id AND name = 'Mezrahi / Berrebi' LIMIT 1;
  IF t11_w IS NULL THEN
    INSERT INTO teams (tournament_id, name) VALUES (t11_id, 'Mezrahi / Berrebi') RETURNING id INTO t11_w;
  END IF;
  SELECT id INTO t11_f FROM teams WHERE tournament_id = t11_id AND name = 'Nataf / Chiche' LIMIT 1;
  IF t11_f IS NULL THEN
    INSERT INTO teams (tournament_id, name) VALUES (t11_id, 'Nataf / Chiche') RETURNING id INTO t11_f;
  END IF;

  -- ============================================================
  -- 4. JOUEURS ↔ ÉQUIPES (team_players)
  --    ON CONFLICT DO NOTHING : idempotent grâce à la PK (team_id, player_id)
  -- ============================================================

  -- T01
  INSERT INTO team_players (team_id, player_id) VALUES (t01_w, p_nahmias_daniel)   ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t01_w, p_zagury_victor)    ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t01_f, p_gitton_harold)    ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t01_f, p_azerraf_albert)   ON CONFLICT DO NOTHING;

  -- T02
  INSERT INTO team_players (team_id, player_id) VALUES (t02_w, p_gitton_harold)    ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t02_w, p_azerraf_albert)   ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t02_f, p_benmoussa_lionel) ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t02_f, p_aymant_gary)      ON CONFLICT DO NOTHING;

  -- T03
  INSERT INTO team_players (team_id, player_id) VALUES (t03_w, p_bismuth_david)    ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t03_w, p_amar_charles)     ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t03_f, p_gitton_harold)    ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t03_f, p_sabban_zack)      ON CONFLICT DO NOTHING;

  -- T04
  INSERT INTO team_players (team_id, player_id) VALUES (t04_w, p_stora_bryan)      ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t04_w, p_bajczman_ruben)   ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t04_f, p_ghouzi_david)     ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t04_f, p_hadjez_jordan)    ON CONFLICT DO NOTHING;

  -- T05
  INSERT INTO team_players (team_id, player_id) VALUES (t05_w, p_hazout_victor)    ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t05_w, p_marrache_david)   ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t05_f, p_gitton_harold)    ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t05_f, p_amar_charles)     ON CONFLICT DO NOTHING;

  -- T06
  INSERT INTO team_players (team_id, player_id) VALUES (t06_w, p_giami_benjamin)   ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t06_w, p_toledano_ewan)    ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t06_f, p_nahmias_daniel)   ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t06_f, p_zeitoun_jeremie)  ON CONFLICT DO NOTHING;

  -- T07
  INSERT INTO team_players (team_id, player_id) VALUES (t07_w, p_zeitoun_david)    ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t07_w, p_noblinski)        ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t07_f, p_sebbag_lionel)    ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t07_f, p_amzelek_jonathan) ON CONFLICT DO NOTHING;

  -- T08
  INSERT INTO team_players (team_id, player_id) VALUES (t08_w, p_mendelson_benjamin) ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t08_w, p_william)           ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t08_f, p_gitton_harold)     ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t08_f, p_alex)              ON CONFLICT DO NOTHING;

  -- T09
  INSERT INTO team_players (team_id, player_id) VALUES (t09_w, p_nahmias_daniel)   ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t09_w, p_zeitoun_jeremie)  ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t09_f, p_nataf_jonas)      ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t09_f, p_benichou_sasha)   ON CONFLICT DO NOTHING;

  -- T10
  INSERT INTO team_players (team_id, player_id) VALUES (t10_w, p_bretonniere_benjamin) ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t10_w, p_berdugo_nico)     ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t10_f, p_mezrahi_arnaud)   ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t10_f, p_cedric)           ON CONFLICT DO NOTHING;

  -- T11
  INSERT INTO team_players (team_id, player_id) VALUES (t11_w, p_mezrahi_arnaud)   ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t11_w, p_berrebi_franck)   ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t11_f, p_nataf_jonas)      ON CONFLICT DO NOTHING;
  INSERT INTO team_players (team_id, player_id) VALUES (t11_f, p_chiche_david)     ON CONFLICT DO NOTHING;

  -- ============================================================
  -- 5. MATCHS PLACEHOLDER — count KPI
  --    status = 'finished', winner_team_id = NULL
  --    (n'affecte pas le KPI "Top Teams" qui filtre sur winner_team_id IS NOT NULL)
  --    55 matchs pour les tournois v20, 66 pour le v50
  -- ============================================================

  IF NOT EXISTS (SELECT 1 FROM matches WHERE tournament_id = t01_id LIMIT 1) THEN
    INSERT INTO matches (tournament_id, team_a_id, team_b_id, status)
    SELECT t01_id, t01_w, t01_f, 'finished' FROM generate_series(1, 55);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM matches WHERE tournament_id = t02_id LIMIT 1) THEN
    INSERT INTO matches (tournament_id, team_a_id, team_b_id, status)
    SELECT t02_id, t02_w, t02_f, 'finished' FROM generate_series(1, 55);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM matches WHERE tournament_id = t03_id LIMIT 1) THEN
    INSERT INTO matches (tournament_id, team_a_id, team_b_id, status)
    SELECT t03_id, t03_w, t03_f, 'finished' FROM generate_series(1, 55);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM matches WHERE tournament_id = t04_id LIMIT 1) THEN
    INSERT INTO matches (tournament_id, team_a_id, team_b_id, status)
    SELECT t04_id, t04_w, t04_f, 'finished' FROM generate_series(1, 55);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM matches WHERE tournament_id = t05_id LIMIT 1) THEN
    INSERT INTO matches (tournament_id, team_a_id, team_b_id, status)
    SELECT t05_id, t05_w, t05_f, 'finished' FROM generate_series(1, 55);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM matches WHERE tournament_id = t06_id LIMIT 1) THEN
    INSERT INTO matches (tournament_id, team_a_id, team_b_id, status)
    SELECT t06_id, t06_w, t06_f, 'finished' FROM generate_series(1, 55);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM matches WHERE tournament_id = t07_id LIMIT 1) THEN
    INSERT INTO matches (tournament_id, team_a_id, team_b_id, status)
    SELECT t07_id, t07_w, t07_f, 'finished' FROM generate_series(1, 55);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM matches WHERE tournament_id = t08_id LIMIT 1) THEN
    INSERT INTO matches (tournament_id, team_a_id, team_b_id, status)
    SELECT t08_id, t08_w, t08_f, 'finished' FROM generate_series(1, 55);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM matches WHERE tournament_id = t09_id LIMIT 1) THEN
    INSERT INTO matches (tournament_id, team_a_id, team_b_id, status)
    SELECT t09_id, t09_w, t09_f, 'finished' FROM generate_series(1, 55);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM matches WHERE tournament_id = t10_id LIMIT 1) THEN
    INSERT INTO matches (tournament_id, team_a_id, team_b_id, status)
    SELECT t10_id, t10_w, t10_f, 'finished' FROM generate_series(1, 55);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM matches WHERE tournament_id = t11_id LIMIT 1) THEN
    INSERT INTO matches (tournament_id, team_a_id, team_b_id, status)
    SELECT t11_id, t11_w, t11_f, 'finished' FROM generate_series(1, 66);
  END IF;

  -- ============================================================
  -- 6. FINALES — playoff_rounds + playoff_matches
  --    La requête "Derniers champions" cherche le playoff_match avec
  --    le round_number le plus élevé (ici = 1, seul round).
  --    winner_id pointe vers l'équipe vainqueur.
  -- ============================================================

  -- T01
  SELECT id INTO r01 FROM playoff_rounds WHERE tournament_id = t01_id LIMIT 1;
  IF r01 IS NULL THEN
    INSERT INTO playoff_rounds (tournament_id, round_number, round_name, bracket_type)
    VALUES (t01_id, 1, 'Finale', 'main') RETURNING id INTO r01;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM playoff_matches WHERE round_id = r01 LIMIT 1) THEN
    INSERT INTO playoff_matches (tournament_id, round_id, match_number, team1_id, team2_id, winner_id, status)
    VALUES (t01_id, r01, 1, t01_w, t01_f, t01_w, 'completed');
  END IF;

  -- T02
  SELECT id INTO r02 FROM playoff_rounds WHERE tournament_id = t02_id LIMIT 1;
  IF r02 IS NULL THEN
    INSERT INTO playoff_rounds (tournament_id, round_number, round_name, bracket_type)
    VALUES (t02_id, 1, 'Finale', 'main') RETURNING id INTO r02;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM playoff_matches WHERE round_id = r02 LIMIT 1) THEN
    INSERT INTO playoff_matches (tournament_id, round_id, match_number, team1_id, team2_id, winner_id, status)
    VALUES (t02_id, r02, 1, t02_w, t02_f, t02_w, 'completed');
  END IF;

  -- T03
  SELECT id INTO r03 FROM playoff_rounds WHERE tournament_id = t03_id LIMIT 1;
  IF r03 IS NULL THEN
    INSERT INTO playoff_rounds (tournament_id, round_number, round_name, bracket_type)
    VALUES (t03_id, 1, 'Finale', 'main') RETURNING id INTO r03;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM playoff_matches WHERE round_id = r03 LIMIT 1) THEN
    INSERT INTO playoff_matches (tournament_id, round_id, match_number, team1_id, team2_id, winner_id, status)
    VALUES (t03_id, r03, 1, t03_w, t03_f, t03_w, 'completed');
  END IF;

  -- T04
  SELECT id INTO r04 FROM playoff_rounds WHERE tournament_id = t04_id LIMIT 1;
  IF r04 IS NULL THEN
    INSERT INTO playoff_rounds (tournament_id, round_number, round_name, bracket_type)
    VALUES (t04_id, 1, 'Finale', 'main') RETURNING id INTO r04;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM playoff_matches WHERE round_id = r04 LIMIT 1) THEN
    INSERT INTO playoff_matches (tournament_id, round_id, match_number, team1_id, team2_id, winner_id, status)
    VALUES (t04_id, r04, 1, t04_w, t04_f, t04_w, 'completed');
  END IF;

  -- T05
  SELECT id INTO r05 FROM playoff_rounds WHERE tournament_id = t05_id LIMIT 1;
  IF r05 IS NULL THEN
    INSERT INTO playoff_rounds (tournament_id, round_number, round_name, bracket_type)
    VALUES (t05_id, 1, 'Finale', 'main') RETURNING id INTO r05;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM playoff_matches WHERE round_id = r05 LIMIT 1) THEN
    INSERT INTO playoff_matches (tournament_id, round_id, match_number, team1_id, team2_id, winner_id, status)
    VALUES (t05_id, r05, 1, t05_w, t05_f, t05_w, 'completed');
  END IF;

  -- T06
  SELECT id INTO r06 FROM playoff_rounds WHERE tournament_id = t06_id LIMIT 1;
  IF r06 IS NULL THEN
    INSERT INTO playoff_rounds (tournament_id, round_number, round_name, bracket_type)
    VALUES (t06_id, 1, 'Finale', 'main') RETURNING id INTO r06;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM playoff_matches WHERE round_id = r06 LIMIT 1) THEN
    INSERT INTO playoff_matches (tournament_id, round_id, match_number, team1_id, team2_id, winner_id, status)
    VALUES (t06_id, r06, 1, t06_w, t06_f, t06_w, 'completed');
  END IF;

  -- T07
  SELECT id INTO r07 FROM playoff_rounds WHERE tournament_id = t07_id LIMIT 1;
  IF r07 IS NULL THEN
    INSERT INTO playoff_rounds (tournament_id, round_number, round_name, bracket_type)
    VALUES (t07_id, 1, 'Finale', 'main') RETURNING id INTO r07;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM playoff_matches WHERE round_id = r07 LIMIT 1) THEN
    INSERT INTO playoff_matches (tournament_id, round_id, match_number, team1_id, team2_id, winner_id, status)
    VALUES (t07_id, r07, 1, t07_w, t07_f, t07_w, 'completed');
  END IF;

  -- T08
  SELECT id INTO r08 FROM playoff_rounds WHERE tournament_id = t08_id LIMIT 1;
  IF r08 IS NULL THEN
    INSERT INTO playoff_rounds (tournament_id, round_number, round_name, bracket_type)
    VALUES (t08_id, 1, 'Finale', 'main') RETURNING id INTO r08;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM playoff_matches WHERE round_id = r08 LIMIT 1) THEN
    INSERT INTO playoff_matches (tournament_id, round_id, match_number, team1_id, team2_id, winner_id, status)
    VALUES (t08_id, r08, 1, t08_w, t08_f, t08_w, 'completed');
  END IF;

  -- T09
  SELECT id INTO r09 FROM playoff_rounds WHERE tournament_id = t09_id LIMIT 1;
  IF r09 IS NULL THEN
    INSERT INTO playoff_rounds (tournament_id, round_number, round_name, bracket_type)
    VALUES (t09_id, 1, 'Finale', 'main') RETURNING id INTO r09;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM playoff_matches WHERE round_id = r09 LIMIT 1) THEN
    INSERT INTO playoff_matches (tournament_id, round_id, match_number, team1_id, team2_id, winner_id, status)
    VALUES (t09_id, r09, 1, t09_w, t09_f, t09_w, 'completed');
  END IF;

  -- T10
  SELECT id INTO r10 FROM playoff_rounds WHERE tournament_id = t10_id LIMIT 1;
  IF r10 IS NULL THEN
    INSERT INTO playoff_rounds (tournament_id, round_number, round_name, bracket_type)
    VALUES (t10_id, 1, 'Finale', 'main') RETURNING id INTO r10;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM playoff_matches WHERE round_id = r10 LIMIT 1) THEN
    INSERT INTO playoff_matches (tournament_id, round_id, match_number, team1_id, team2_id, winner_id, status)
    VALUES (t10_id, r10, 1, t10_w, t10_f, t10_w, 'completed');
  END IF;

  -- T11
  SELECT id INTO r11 FROM playoff_rounds WHERE tournament_id = t11_id LIMIT 1;
  IF r11 IS NULL THEN
    INSERT INTO playoff_rounds (tournament_id, round_number, round_name, bracket_type)
    VALUES (t11_id, 1, 'Finale', 'main') RETURNING id INTO r11;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM playoff_matches WHERE round_id = r11 LIMIT 1) THEN
    INSERT INTO playoff_matches (tournament_id, round_id, match_number, team1_id, team2_id, winner_id, status)
    VALUES (t11_id, r11, 1, t11_w, t11_f, t11_w, 'completed');
  END IF;

  RAISE NOTICE '✅ Seed historique terminé — 11 tournois, 33 joueurs, 22 équipes, 616 matchs placeholder (10×55 + 1×66), 11 finales playoff.';

END $$;
