-- ============================================================
-- Seed : Superligue 15 mars — 25 équipes / 50 joueurs
-- ============================================================
-- ⚠️  ANOMALIES À CORRIGER MANUELLEMENT :
--   • Romain Zerbib (équipe 4)  : numéro N/A → placeholder '0000000004'
--   • Ethan Berrebi  (équipe 25) : même numéro que Franck Berrebi  → placeholder '0000000025'
-- ============================================================

DO $$
DECLARE
  v_tid uuid;

  -- Joueurs (p<equipe><a|b>)
  p01a uuid; p01b uuid;
  p02a uuid; p02b uuid;
  p03a uuid; p03b uuid;
  p04a uuid; p04b uuid;
  p05a uuid; p05b uuid;
  p06a uuid; p06b uuid;
  p07a uuid; p07b uuid;
  p08a uuid; p08b uuid;
  p09a uuid; p09b uuid;
  p10a uuid; p10b uuid;
  p11a uuid; p11b uuid;
  p12a uuid; p12b uuid;
  p13a uuid; p13b uuid;
  p14a uuid; p14b uuid;
  p15a uuid; p15b uuid;
  p16a uuid; p16b uuid;
  p17a uuid; p17b uuid;
  p18a uuid; p18b uuid;
  p19a uuid; p19b uuid;
  p20a uuid; p20b uuid;
  p21a uuid; p21b uuid;
  p22a uuid; p22b uuid;
  p23a uuid; p23b uuid;
  p24a uuid; p24b uuid;
  p25a uuid; p25b uuid;

  -- Équipes
  t01 uuid; t02 uuid; t03 uuid; t04 uuid; t05 uuid;
  t06 uuid; t07 uuid; t08 uuid; t09 uuid; t10 uuid;
  t11 uuid; t12 uuid; t13 uuid; t14 uuid; t15 uuid;
  t16 uuid; t17 uuid; t18 uuid; t19 uuid; t20 uuid;
  t21 uuid; t22 uuid; t23 uuid; t24 uuid; t25 uuid;

BEGIN

  -- ============================================================
  -- 1. Tournoi
  -- ============================================================
  SELECT id INTO v_tid FROM tournaments WHERE slug = 'superligue-15-mars';
  IF v_tid IS NULL THEN
    RAISE EXCEPTION 'Tournoi "superligue-15-mars" introuvable';
  END IF;

  -- ============================================================
  -- 2. Joueurs
  --    ON CONFLICT : si le numéro existe déjà, retourne l'id existant
  -- ============================================================

  -- Équipe 1 : Narboni / Nahmias
  INSERT INTO players (first_name, last_name, phone) VALUES ('Lucas',   'Narboni',  '0665071918')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p01a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('Daniel',  'Nahmias',  '0663471851')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p01b;

  -- Équipe 2 : Hazout / Marrache
  INSERT INTO players (first_name, last_name, phone) VALUES ('Victor',  'Hazout',   '0620191828')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p02a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('David',   'Marrache', '0619922943')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p02b;

  -- Équipe 3 : Bedjai / Ouhioun
  INSERT INTO players (first_name, last_name, phone) VALUES ('Kévin',   'Bedjai',   '0656355050')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p03a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('Simon',   'Ouhioun',  '0699540311')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p03b;

  -- Équipe 4 : Noblinski / Zerbib  ⚠️ Zerbib : numéro manquant → placeholder
  INSERT INTO players (first_name, last_name, phone) VALUES ('Matias',  'Noblinski','0687778147')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p04a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('Romain',  'Zerbib',   '0000000004')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p04b;

  -- Équipe 5 : B.Cohen / Lévy
  INSERT INTO players (first_name, last_name, phone) VALUES ('Ben',     'Cohen',    '0681319941')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p05a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('Dan',     'Lévy',     '0625021024')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p05b;

  -- Équipe 6 : Arditti / Fellous
  INSERT INTO players (first_name, last_name, phone) VALUES ('Jérémie', 'Arditti',  '0699177470')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p06a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('Kevin',   'Fellous',  '0620299299')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p06b;

  -- Équipe 7 : Mezrahi / Hackoun
  INSERT INTO players (first_name, last_name, phone) VALUES ('Arnaud',  'Mezrahi',  '0660876153')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p07a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('Olivier', 'Hackoun',  '0787007646')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p07b;

  -- Équipe 8 : Bajczman / Medard
  INSERT INTO players (first_name, last_name, phone) VALUES ('Ruben',   'Bajczman', '0611862667')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p08a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('Thomas',  'Medard',   '0674064573')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p08b;

  -- Équipe 9 : Amar / Seknadje
  INSERT INTO players (first_name, last_name, phone) VALUES ('Charles', 'Amar',     '0620546862')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p09a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('Joan',    'Seknadje', '0667791270')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p09b;

  -- Équipe 10 : Benjoar / Sarfati
  INSERT INTO players (first_name, last_name, phone) VALUES ('Mickael', 'Benjoar',  '0622369103')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p10a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('Benjamin','Sarfati',  '0612185880')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p10b;

  -- Équipe 11 : R.Namias / J.Namias
  INSERT INTO players (first_name, last_name, phone) VALUES ('Raphael', 'Namias',   '0615946591')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p11a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('Jonathan','Namias',   '0682264862')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p11b;

  -- Équipe 12 : Mendelson / Boccara
  INSERT INTO players (first_name, last_name, phone) VALUES ('Benjamin','Mendelson','0761017989')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p12a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('Alex',    'Boccara',  '0606768180')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p12b;

  -- Équipe 13 : Benmoussa / Gitton
  INSERT INTO players (first_name, last_name, phone) VALUES ('Lionel',  'Benmoussa','0610393090')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p13a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('Harold',  'Gitton',   '0621215986')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p13b;

  -- Équipe 14 : B.Giami / Toledano
  INSERT INTO players (first_name, last_name, phone) VALUES ('Benjamin','Giami',    '0623194578')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p14a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('Ewan',    'Toledano', '0603779521')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p14b;

  -- Équipe 15 : Aboujed / Rose
  INSERT INTO players (first_name, last_name, phone) VALUES ('Zach',    'Aboujed',  '0662893505')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p15a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('Ethan',   'Rose',     '0676550744')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p15b;

  -- Équipe 16 : Ayman / Sebag
  INSERT INTO players (first_name, last_name, phone) VALUES ('Gary',    'Ayman',    '0667610294')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p16a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('Zack',    'Sebag',    '0698857171')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p16b;

  -- Équipe 17 : Sabban / Cattan
  INSERT INTO players (first_name, last_name, phone) VALUES ('Zack',    'Sabban',   '0681861393')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p17a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('Thierry', 'Cattan',   '0611810920')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p17b;

  -- Équipe 18 : E.Giami / Slama
  INSERT INTO players (first_name, last_name, phone) VALUES ('Eliott',  'Giami',    '0788878844')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p18a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('Jordan',  'Slama',    '0673813616')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p18b;

  -- Équipe 19 : Sala / Bismuth
  INSERT INTO players (first_name, last_name, phone) VALUES ('Isaac',   'Sala',     '0611314559')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p19a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('David',   'Bismuth',  '0611810990')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p19b;

  -- Équipe 20 : A.Cohen / Fitussi
  INSERT INTO players (first_name, last_name, phone) VALUES ('Alexis',  'Cohen',    '0620640592')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p20a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('Alexandre','Fitussi', '0664852428')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p20b;

  -- Équipe 21 : Benisty / Guenik
  INSERT INTO players (first_name, last_name, phone) VALUES ('Teddy',   'Benisty',  '0627063987')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p21a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('Anthony', 'Guenik',   '0625690265')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p21b;

  -- Équipe 22 : Azerraf / Botbol
  INSERT INTO players (first_name, last_name, phone) VALUES ('Albert',  'Azerraf',  '0671119836')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p22a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('Gad',     'Botbol',   '0620581001')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p22b;

  -- Équipe 23 : Nataf / Chiche
  INSERT INTO players (first_name, last_name, phone) VALUES ('Jonas',   'Nataf',    '0679574248')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p23a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('David',   'Chiche',   '0626931081')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p23b;

  -- Équipe 24 : M.Zribi / J.Zribi
  INSERT INTO players (first_name, last_name, phone) VALUES ('Mika',    'Zribi',    '0664617450')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p24a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('Julia',   'Zribi',    '0661897552')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p24b;

  -- Équipe 25 : F.Berrebi / E.Berrebi  ⚠️ même numéro → placeholder pour Ethan
  INSERT INTO players (first_name, last_name, phone) VALUES ('Franck',  'Berrebi',  '0628804146')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p25a;
  INSERT INTO players (first_name, last_name, phone) VALUES ('Ethan',   'Berrebi',  '0000000025')
    ON CONFLICT (public.normalize_phone(phone)) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO p25b;

  -- ============================================================
  -- 3. Inscriptions (toutes approved)
  --    payment_status : TRUE = payé, FALSE = cash jour J
  -- ============================================================
  INSERT INTO registrations (tournament_id, player_id, status, payment_status, payment_method)
  VALUES
    -- Équipe 1
    (v_tid, p01a, 'approved', TRUE,  NULL),   -- Lucas Narboni       payé
    (v_tid, p01b, 'approved', TRUE,  NULL),   -- Daniel Nahmias      payé
    -- Équipe 2
    (v_tid, p02a, 'approved', TRUE,  NULL),   -- Victor Hazout       payé
    (v_tid, p02b, 'approved', TRUE,  NULL),   -- David Marrache      payé
    -- Équipe 3
    (v_tid, p03a, 'approved', FALSE, 'cash'), -- Kévin Bedjai        cash jour J
    (v_tid, p03b, 'approved', TRUE,  NULL),   -- Simon Ouhioun       payé
    -- Équipe 4
    (v_tid, p04a, 'approved', TRUE,  NULL),   -- Matias Noblinski    payé
    (v_tid, p04b, 'approved', TRUE,  NULL),   -- Romain Zerbib       payé
    -- Équipe 5
    (v_tid, p05a, 'approved', TRUE,  NULL),   -- Ben Cohen           payé
    (v_tid, p05b, 'approved', TRUE,  NULL),   -- Dan Lévy            payé
    -- Équipe 6
    (v_tid, p06a, 'approved', TRUE,  NULL),   -- Jérémie Arditti     payé
    (v_tid, p06b, 'approved', TRUE,  NULL),   -- Kevin Fellous       payé
    -- Équipe 7
    (v_tid, p07a, 'approved', TRUE,  NULL),   -- Arnaud Mezrahi      payé
    (v_tid, p07b, 'approved', TRUE,  NULL),   -- Olivier Hackoun     payé
    -- Équipe 8
    (v_tid, p08a, 'approved', TRUE,  NULL),   -- Ruben Bajczman      payé
    (v_tid, p08b, 'approved', TRUE,  NULL),   -- Thomas Medard       payé
    -- Équipe 9
    (v_tid, p09a, 'approved', TRUE,  NULL),   -- Charles Amar        payé
    (v_tid, p09b, 'approved', FALSE, 'cash'), -- Joan Seknadje       cash jour J
    -- Équipe 10
    (v_tid, p10a, 'approved', TRUE,  NULL),   -- Mickael Benjoar     payé
    (v_tid, p10b, 'approved', TRUE,  NULL),   -- Benjamin Sarfati    payé
    -- Équipe 11
    (v_tid, p11a, 'approved', TRUE,  NULL),   -- Raphael Namias      payé
    (v_tid, p11b, 'approved', TRUE,  NULL),   -- Jonathan Namias     payé
    -- Équipe 12
    (v_tid, p12a, 'approved', TRUE,  NULL),   -- Benjamin Mendelson  payé
    (v_tid, p12b, 'approved', TRUE,  NULL),   -- Alex Boccara        payé
    -- Équipe 13
    (v_tid, p13a, 'approved', TRUE,  NULL),   -- Lionel Benmoussa    payé
    (v_tid, p13b, 'approved', TRUE,  NULL),   -- Harold Gitton       payé
    -- Équipe 14
    (v_tid, p14a, 'approved', FALSE, 'cash'), -- Benjamin Giami      cash jour J
    (v_tid, p14b, 'approved', TRUE,  NULL),   -- Ewan Toledano       payé
    -- Équipe 15
    (v_tid, p15a, 'approved', TRUE,  NULL),   -- Zach Aboujed        payé
    (v_tid, p15b, 'approved', TRUE,  NULL),   -- Ethan Rose          payé
    -- Équipe 16
    (v_tid, p16a, 'approved', TRUE,  NULL),   -- Gary Ayman          payé
    (v_tid, p16b, 'approved', TRUE,  NULL),   -- Zack Sebag          payé
    -- Équipe 17
    (v_tid, p17a, 'approved', TRUE,  NULL),   -- Zack Sabban         payé
    (v_tid, p17b, 'approved', TRUE,  NULL),   -- Thierry Cattan      payé
    -- Équipe 18
    (v_tid, p18a, 'approved', TRUE,  NULL),   -- Eliott Giami        payé
    (v_tid, p18b, 'approved', TRUE,  NULL),   -- Jordan Slama        payé
    -- Équipe 19
    (v_tid, p19a, 'approved', TRUE,  NULL),   -- Isaac Sala          payé
    (v_tid, p19b, 'approved', TRUE,  NULL),   -- David Bismuth       payé
    -- Équipe 20
    (v_tid, p20a, 'approved', FALSE, 'cash'), -- Alexis Cohen        cash jour J
    (v_tid, p20b, 'approved', TRUE,  NULL),   -- Alexandre Fitussi   payé
    -- Équipe 21
    (v_tid, p21a, 'approved', TRUE,  NULL),   -- Teddy Benisty       payé
    (v_tid, p21b, 'approved', TRUE,  NULL),   -- Anthony Guenik      payé
    -- Équipe 22
    (v_tid, p22a, 'approved', TRUE,  NULL),   -- Albert Azerraf      payé
    (v_tid, p22b, 'approved', TRUE,  NULL),   -- Gad Botbol          payé
    -- Équipe 23
    (v_tid, p23a, 'approved', TRUE,  NULL),   -- Jonas Nataf         payé
    (v_tid, p23b, 'approved', TRUE,  NULL),   -- David Chiche        payé
    -- Équipe 24
    (v_tid, p24a, 'approved', TRUE,  NULL),   -- Mika Zribi          payé
    (v_tid, p24b, 'approved', TRUE,  NULL),   -- Julia Zribi         payé
    -- Équipe 25
    (v_tid, p25a, 'approved', TRUE,  NULL),   -- Franck Berrebi      payé
    (v_tid, p25b, 'approved', TRUE,  NULL)    -- Ethan Berrebi       payé
  ON CONFLICT (tournament_id, player_id) DO UPDATE
    SET status         = EXCLUDED.status,
        payment_status = EXCLUDED.payment_status,
        payment_method = EXCLUDED.payment_method;

  -- ============================================================
  -- 4. Équipes et paires
  -- ============================================================

  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'Narboni / Nahmias')    RETURNING id INTO t01;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'Hazout / Marrache')    RETURNING id INTO t02;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'Bedjai / Ouhioun')     RETURNING id INTO t03;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'Noblinski / Zerbib')   RETURNING id INTO t04;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'B.Cohen / Lévy')       RETURNING id INTO t05;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'Arditti / Fellous')    RETURNING id INTO t06;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'Mezrahi / Hackoun')    RETURNING id INTO t07;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'Bajczman / Medard')    RETURNING id INTO t08;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'Amar / Seknadje')      RETURNING id INTO t09;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'Benjoar / Sarfati')    RETURNING id INTO t10;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'R.Namias / J.Namias')  RETURNING id INTO t11;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'Mendelson / Boccara')  RETURNING id INTO t12;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'Benmoussa / Gitton')   RETURNING id INTO t13;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'B.Giami / Toledano')   RETURNING id INTO t14;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'Aboujed / Rose')       RETURNING id INTO t15;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'Ayman / Sebag')        RETURNING id INTO t16;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'Sabban / Cattan')      RETURNING id INTO t17;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'E.Giami / Slama')      RETURNING id INTO t18;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'Sala / Bismuth')       RETURNING id INTO t19;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'A.Cohen / Fitussi')    RETURNING id INTO t20;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'Benisty / Guenik')     RETURNING id INTO t21;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'Azerraf / Botbol')     RETURNING id INTO t22;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'Nataf / Chiche')       RETURNING id INTO t23;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'M.Zribi / J.Zribi')   RETURNING id INTO t24;
  INSERT INTO teams (tournament_id, name) VALUES (v_tid, 'F.Berrebi / E.Berrebi') RETURNING id INTO t25;

  INSERT INTO team_players (team_id, player_id) VALUES (t01, p01a), (t01, p01b);
  INSERT INTO team_players (team_id, player_id) VALUES (t02, p02a), (t02, p02b);
  INSERT INTO team_players (team_id, player_id) VALUES (t03, p03a), (t03, p03b);
  INSERT INTO team_players (team_id, player_id) VALUES (t04, p04a), (t04, p04b);
  INSERT INTO team_players (team_id, player_id) VALUES (t05, p05a), (t05, p05b);
  INSERT INTO team_players (team_id, player_id) VALUES (t06, p06a), (t06, p06b);
  INSERT INTO team_players (team_id, player_id) VALUES (t07, p07a), (t07, p07b);
  INSERT INTO team_players (team_id, player_id) VALUES (t08, p08a), (t08, p08b);
  INSERT INTO team_players (team_id, player_id) VALUES (t09, p09a), (t09, p09b);
  INSERT INTO team_players (team_id, player_id) VALUES (t10, p10a), (t10, p10b);
  INSERT INTO team_players (team_id, player_id) VALUES (t11, p11a), (t11, p11b);
  INSERT INTO team_players (team_id, player_id) VALUES (t12, p12a), (t12, p12b);
  INSERT INTO team_players (team_id, player_id) VALUES (t13, p13a), (t13, p13b);
  INSERT INTO team_players (team_id, player_id) VALUES (t14, p14a), (t14, p14b);
  INSERT INTO team_players (team_id, player_id) VALUES (t15, p15a), (t15, p15b);
  INSERT INTO team_players (team_id, player_id) VALUES (t16, p16a), (t16, p16b);
  INSERT INTO team_players (team_id, player_id) VALUES (t17, p17a), (t17, p17b);
  INSERT INTO team_players (team_id, player_id) VALUES (t18, p18a), (t18, p18b);
  INSERT INTO team_players (team_id, player_id) VALUES (t19, p19a), (t19, p19b);
  INSERT INTO team_players (team_id, player_id) VALUES (t20, p20a), (t20, p20b);
  INSERT INTO team_players (team_id, player_id) VALUES (t21, p21a), (t21, p21b);
  INSERT INTO team_players (team_id, player_id) VALUES (t22, p22a), (t22, p22b);
  INSERT INTO team_players (team_id, player_id) VALUES (t23, p23a), (t23, p23b);
  INSERT INTO team_players (team_id, player_id) VALUES (t24, p24a), (t24, p24b);
  INSERT INTO team_players (team_id, player_id) VALUES (t25, p25a), (t25, p25b);

  RAISE NOTICE 'OK : 50 joueurs, 25 équipes créés pour le tournoi %.', v_tid;

END $$;
