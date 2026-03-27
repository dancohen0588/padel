-- ============================================================
-- Script SQL : Scores Superligue 15 mars
-- Tournament ID : f10ed0c9-b8c2-483d-b45b-7225f580f74a
-- 50 matchs de poules (5 rounds × 10 matchs)
-- Généré le 27 mars 2026
-- ============================================================
-- CORRESPONDANCE ÉQUIPES (Google Sheet → Supabase) :
-- Poule A : "Charles Seknadje"  → Amar / Seknadje      (a8204f79)
--           "Charlie Victor"    → Hazout / Marrache     (b8bc07e2)
--           "Akoun Alex B"      → Mendelson / Boccara   (8a6bba71)
--           "Lucas Daniel"      → Narboni / Nahmias     (aec9ec31)
--           "Arnaud Olivier"    → Mezrahi / Hackoun     (a321c477)
-- Poule B : "Elliott Jordan"    → E.Giami / Slama       (65aeb096)
--           "Benjo Ewan"        → B.Giami / Toledano    (056799a3)
--           "Isaac Bismuth"     → Sala / Bismuth        (777b55c7)
--           "Jonas Chiche"      → Nataf / Chiche        (2a74d575)
--           "Lionel B Gitton"   → Benmoussa / Gitton    (90bca314)
-- Poule C : "Teddy Guenik"      → Benisty / Guenik      (359aea16)
--           "Ben Co Dan"        → B.Cohen / Lévy        (8f8f8f30)
--           "Nahmias Jeremy"    → R.Namias / J.Namias   (74fa39de)
--           "Jeremie Kevin"     → Arditti / Fellous     (f465d4bb)
--           "Alexis Alex"       → A.Cohen / Fitussi     (f6e7688f)
-- Poule D : "Benjoar Serfati"   → Benjoar / Sarfati     (4690d961)
--           "Franck Fils"       → F.Berrebi / E.Berrebi (c9e9ce99)
--           "Gary A Zach"       → Ayman / Sebag         (432a91a9)
--           "Ruben Thomas"      → Bajczman / Medard     (fef3623a)
--           "Albert Gad"        → Azerraf / Botbol      (f1a8008f)
-- Poule E : "Matias Romain"     → Noblinski / Zerbib    (209f7847)
--           "Zach Thierry Cattan"→ Sabban / Cattan      (96b5750e)
--           "Kevin B Simon"     → Bedjai / Ouhioun      (0e14b2e7)
--           "Anthony Benjamin"  → M.Zribi / J.Zribi     (a4bab1c2)
--           "Zach Ethan"        → Aboujed / Rose        (186828e2)
-- ============================================================
-- ⚠️  ATTENTION : Match R2-T9 Mezrahi/Hackoun vs Aboujed/Rose
--     score 0-0 dans le sheet → probablement match non joué.
--     À vérifier avant d'exécuter.
-- ============================================================

BEGIN;

-- ============================================================
-- ÉTAPE 1 : Insertion des 50 matchs
-- ============================================================
INSERT INTO matches (
  id, tournament_id, pool_id,
  team_a_id, team_b_id,
  status, winner_team_id,
  sets_won_a, sets_won_b,
  games_won_a, games_won_b
) VALUES

-- === ROUND 1 (9h) : Poule A vs B | Poule C vs D | Poule E = Repos ===
('00000000-0000-0000-0001-000000000001','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'a8204f79-6884-472d-b108-5fda4750cf24','65aeb096-8446-492d-a8c2-d029405aab0d','finished',NULL,0,0,0,0),
('00000000-0000-0000-0001-000000000002','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'b8bc07e2-e6e5-4ec6-8c68-1fb5762ee629','056799a3-3e10-47c8-8fb2-a92f409225a4','finished',NULL,0,0,0,0),
('00000000-0000-0000-0001-000000000003','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'8a6bba71-4c56-4a0d-ae96-d485d9ea6a12','777b55c7-84c5-412c-b318-558272b9d874','finished',NULL,0,0,0,0),
('00000000-0000-0000-0001-000000000004','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'aec9ec31-57f8-4604-889f-6c16a1424ec9','2a74d575-4b04-4f3e-a124-490d8b1eb176','finished',NULL,0,0,0,0),
('00000000-0000-0000-0001-000000000005','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'a321c477-f451-4d11-b443-20a81d81f273','90bca314-8fcf-4d1f-b993-38c88e45f7cf','finished',NULL,0,0,0,0),
('00000000-0000-0000-0001-000000000006','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'359aea16-40d6-45dd-b76a-8b16474faf98','4690d961-e7fd-4872-ac24-69cdc3cc4856','finished',NULL,0,0,0,0),
('00000000-0000-0000-0001-000000000007','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'8f8f8f30-e406-4b47-8937-b5905b3ffe6b','c9e9ce99-639a-4a33-8144-9f82b4e12f07','finished',NULL,0,0,0,0),
('00000000-0000-0000-0001-000000000008','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'74fa39de-37a0-44bf-8576-cc155ec2c981','432a91a9-3dbc-433c-9a89-e84304f719be','finished',NULL,0,0,0,0),
('00000000-0000-0000-0001-000000000009','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'f465d4bb-2daa-4ba3-b994-549900132eb6','fef3623a-90f2-4651-b448-d0512904f92b','finished',NULL,0,0,0,0),
('00000000-0000-0000-0001-000000000010','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'f6e7688f-22c6-4d66-9b80-cb8b481127ca','f1a8008f-2ba0-40ed-aa04-86865829237d','finished',NULL,0,0,0,0),

-- === ROUND 2 (9h30) : Poule A vs E | Poule B vs C | Poule D = Repos ===
('00000000-0000-0000-0002-000000000011','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'a8204f79-6884-472d-b108-5fda4750cf24','209f7847-54bc-4770-96b6-4ef62ff599e7','finished',NULL,0,0,0,0),
('00000000-0000-0000-0002-000000000012','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'b8bc07e2-e6e5-4ec6-8c68-1fb5762ee629','96b5750e-03a5-4bb5-8a19-ecad94477929','finished',NULL,0,0,0,0),
('00000000-0000-0000-0002-000000000013','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'8a6bba71-4c56-4a0d-ae96-d485d9ea6a12','0e14b2e7-3f45-4043-bbff-c6b8a14aed39','finished',NULL,0,0,0,0),
('00000000-0000-0000-0002-000000000014','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'aec9ec31-57f8-4604-889f-6c16a1424ec9','a4bab1c2-dc4b-45fa-afcd-f983c3e80917','finished',NULL,0,0,0,0),
('00000000-0000-0000-0002-000000000015','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'a321c477-f451-4d11-b443-20a81d81f273','186828e2-c635-4274-aaa2-47bce042d767','finished',NULL,0,0,0,0), -- ⚠️ 0-0
('00000000-0000-0000-0002-000000000016','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'65aeb096-8446-492d-a8c2-d029405aab0d','359aea16-40d6-45dd-b76a-8b16474faf98','finished',NULL,0,0,0,0),
('00000000-0000-0000-0002-000000000017','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'056799a3-3e10-47c8-8fb2-a92f409225a4','8f8f8f30-e406-4b47-8937-b5905b3ffe6b','finished',NULL,0,0,0,0),
('00000000-0000-0000-0002-000000000018','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'777b55c7-84c5-412c-b318-558272b9d874','74fa39de-37a0-44bf-8576-cc155ec2c981','finished',NULL,0,0,0,0),
('00000000-0000-0000-0002-000000000019','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'2a74d575-4b04-4f3e-a124-490d8b1eb176','f465d4bb-2daa-4ba3-b994-549900132eb6','finished',NULL,0,0,0,0),
('00000000-0000-0000-0002-000000000020','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'90bca314-8fcf-4d1f-b993-38c88e45f7cf','f6e7688f-22c6-4d66-9b80-cb8b481127ca','finished',NULL,0,0,0,0),

-- === ROUND 3 (10h) : Poule D vs E | Poule A vs C | Poule B = Repos ===
('00000000-0000-0000-0003-000000000021','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'4690d961-e7fd-4872-ac24-69cdc3cc4856','209f7847-54bc-4770-96b6-4ef62ff599e7','finished',NULL,0,0,0,0),
('00000000-0000-0000-0003-000000000022','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'c9e9ce99-639a-4a33-8144-9f82b4e12f07','96b5750e-03a5-4bb5-8a19-ecad94477929','finished',NULL,0,0,0,0),
('00000000-0000-0000-0003-000000000023','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'432a91a9-3dbc-433c-9a89-e84304f719be','0e14b2e7-3f45-4043-bbff-c6b8a14aed39','finished',NULL,0,0,0,0),
('00000000-0000-0000-0003-000000000024','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'fef3623a-90f2-4651-b448-d0512904f92b','a4bab1c2-dc4b-45fa-afcd-f983c3e80917','finished',NULL,0,0,0,0),
('00000000-0000-0000-0003-000000000025','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'f1a8008f-2ba0-40ed-aa04-86865829237d','186828e2-c635-4274-aaa2-47bce042d767','finished',NULL,0,0,0,0),
('00000000-0000-0000-0003-000000000026','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'a8204f79-6884-472d-b108-5fda4750cf24','359aea16-40d6-45dd-b76a-8b16474faf98','finished',NULL,0,0,0,0),
('00000000-0000-0000-0003-000000000027','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'b8bc07e2-e6e5-4ec6-8c68-1fb5762ee629','8f8f8f30-e406-4b47-8937-b5905b3ffe6b','finished',NULL,0,0,0,0),
('00000000-0000-0000-0003-000000000028','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'8a6bba71-4c56-4a0d-ae96-d485d9ea6a12','74fa39de-37a0-44bf-8576-cc155ec2c981','finished',NULL,0,0,0,0),
('00000000-0000-0000-0003-000000000029','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'aec9ec31-57f8-4604-889f-6c16a1424ec9','f465d4bb-2daa-4ba3-b994-549900132eb6','finished',NULL,0,0,0,0),
('00000000-0000-0000-0003-000000000030','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'a321c477-f451-4d11-b443-20a81d81f273','f6e7688f-22c6-4d66-9b80-cb8b481127ca','finished',NULL,0,0,0,0),

-- === ROUND 4 (10h30) : Poule B vs D | Poule C vs E | Poule A = Repos ===
('00000000-0000-0000-0004-000000000031','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'65aeb096-8446-492d-a8c2-d029405aab0d','4690d961-e7fd-4872-ac24-69cdc3cc4856','finished',NULL,0,0,0,0),
('00000000-0000-0000-0004-000000000032','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'056799a3-3e10-47c8-8fb2-a92f409225a4','c9e9ce99-639a-4a33-8144-9f82b4e12f07','finished',NULL,0,0,0,0),
('00000000-0000-0000-0004-000000000033','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'777b55c7-84c5-412c-b318-558272b9d874','432a91a9-3dbc-433c-9a89-e84304f719be','finished',NULL,0,0,0,0),
('00000000-0000-0000-0004-000000000034','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'2a74d575-4b04-4f3e-a124-490d8b1eb176','fef3623a-90f2-4651-b448-d0512904f92b','finished',NULL,0,0,0,0),
('00000000-0000-0000-0004-000000000035','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'90bca314-8fcf-4d1f-b993-38c88e45f7cf','f1a8008f-2ba0-40ed-aa04-86865829237d','finished',NULL,0,0,0,0),
('00000000-0000-0000-0004-000000000036','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'359aea16-40d6-45dd-b76a-8b16474faf98','209f7847-54bc-4770-96b6-4ef62ff599e7','finished',NULL,0,0,0,0),
('00000000-0000-0000-0004-000000000037','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'8f8f8f30-e406-4b47-8937-b5905b3ffe6b','96b5750e-03a5-4bb5-8a19-ecad94477929','finished',NULL,0,0,0,0),
('00000000-0000-0000-0004-000000000038','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'74fa39de-37a0-44bf-8576-cc155ec2c981','0e14b2e7-3f45-4043-bbff-c6b8a14aed39','finished',NULL,0,0,0,0),
('00000000-0000-0000-0004-000000000039','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'f465d4bb-2daa-4ba3-b994-549900132eb6','a4bab1c2-dc4b-45fa-afcd-f983c3e80917','finished',NULL,0,0,0,0),
('00000000-0000-0000-0004-000000000040','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'f6e7688f-22c6-4d66-9b80-cb8b481127ca','186828e2-c635-4274-aaa2-47bce042d767','finished',NULL,0,0,0,0),

-- === ROUND 5 (11h) : Poule A vs D | Poule B vs E | Poule C = Repos ===
('00000000-0000-0000-0005-000000000041','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'a8204f79-6884-472d-b108-5fda4750cf24','4690d961-e7fd-4872-ac24-69cdc3cc4856','finished',NULL,0,0,0,0),
('00000000-0000-0000-0005-000000000042','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'b8bc07e2-e6e5-4ec6-8c68-1fb5762ee629','c9e9ce99-639a-4a33-8144-9f82b4e12f07','finished',NULL,0,0,0,0),
('00000000-0000-0000-0005-000000000043','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'8a6bba71-4c56-4a0d-ae96-d485d9ea6a12','432a91a9-3dbc-433c-9a89-e84304f719be','finished',NULL,0,0,0,0),
('00000000-0000-0000-0005-000000000044','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'aec9ec31-57f8-4604-889f-6c16a1424ec9','fef3623a-90f2-4651-b448-d0512904f92b','finished',NULL,0,0,0,0),
('00000000-0000-0000-0005-000000000045','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'a321c477-f451-4d11-b443-20a81d81f273','f1a8008f-2ba0-40ed-aa04-86865829237d','finished',NULL,0,0,0,0),
('00000000-0000-0000-0005-000000000046','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'65aeb096-8446-492d-a8c2-d029405aab0d','209f7847-54bc-4770-96b6-4ef62ff599e7','finished',NULL,0,0,0,0),
('00000000-0000-0000-0005-000000000047','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'056799a3-3e10-47c8-8fb2-a92f409225a4','96b5750e-03a5-4bb5-8a19-ecad94477929','finished',NULL,0,0,0,0),
('00000000-0000-0000-0005-000000000048','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'777b55c7-84c5-412c-b318-558272b9d874','0e14b2e7-3f45-4043-bbff-c6b8a14aed39','finished',NULL,0,0,0,0),
('00000000-0000-0000-0005-000000000049','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'2a74d575-4b04-4f3e-a124-490d8b1eb176','a4bab1c2-dc4b-45fa-afcd-f983c3e80917','finished',NULL,0,0,0,0),
('00000000-0000-0000-0005-000000000050','f10ed0c9-b8c2-483d-b45b-7225f580f74a',NULL,'90bca314-8fcf-4d1f-b993-38c88e45f7cf','186828e2-c635-4274-aaa2-47bce042d767','finished',NULL,0,0,0,0);

-- ============================================================
-- ÉTAPE 2 : Insertion des scores (1 set par match)
-- Format : team_a_games - team_b_games
-- ============================================================
INSERT INTO match_sets (id, match_id, set_order, team_a_games, team_b_games) VALUES

-- ROUND 1 (9h)
(gen_random_uuid(),'00000000-0000-0000-0001-000000000001',1,3,6),  -- Amar/Seknadje       3-6  E.Giami/Slama
(gen_random_uuid(),'00000000-0000-0000-0001-000000000002',1,6,2),  -- Hazout/Marrache     6-2  B.Giami/Toledano
(gen_random_uuid(),'00000000-0000-0000-0001-000000000003',1,6,4),  -- Mendelson/Boccara   6-4  Sala/Bismuth
(gen_random_uuid(),'00000000-0000-0000-0001-000000000004',1,1,6),  -- Narboni/Nahmias     1-6  Nataf/Chiche
(gen_random_uuid(),'00000000-0000-0000-0001-000000000005',1,6,5),  -- Mezrahi/Hackoun     6-5  Benmoussa/Gitton
(gen_random_uuid(),'00000000-0000-0000-0001-000000000006',1,6,0),  -- Benisty/Guenik      6-0  Benjoar/Sarfati
(gen_random_uuid(),'00000000-0000-0000-0001-000000000007',1,2,6),  -- B.Cohen/Lévy        2-6  F.Berrebi/E.Berrebi
(gen_random_uuid(),'00000000-0000-0000-0001-000000000008',1,0,6),  -- R.Namias/J.Namias   0-6  Ayman/Sebag
(gen_random_uuid(),'00000000-0000-0000-0001-000000000009',1,0,6),  -- Arditti/Fellous     0-6  Bajczman/Medard
(gen_random_uuid(),'00000000-0000-0000-0001-000000000010',1,1,6),  -- A.Cohen/Fitussi     1-6  Azerraf/Botbol

-- ROUND 2 (9h30)
(gen_random_uuid(),'00000000-0000-0000-0002-000000000011',1,6,3),  -- Amar/Seknadje       6-3  Noblinski/Zerbib
(gen_random_uuid(),'00000000-0000-0000-0002-000000000012',1,6,3),  -- Hazout/Marrache     6-3  Sabban/Cattan
(gen_random_uuid(),'00000000-0000-0000-0002-000000000013',1,6,2),  -- Mendelson/Boccara   6-2  Bedjai/Ouhioun
(gen_random_uuid(),'00000000-0000-0000-0002-000000000014',1,6,3),  -- Narboni/Nahmias     6-3  M.Zribi/J.Zribi
(gen_random_uuid(),'00000000-0000-0000-0002-000000000015',1,0,0),  -- Mezrahi/Hackoun     0-0  Aboujed/Rose ⚠️
(gen_random_uuid(),'00000000-0000-0000-0002-000000000016',1,6,1),  -- E.Giami/Slama       6-1  Benisty/Guenik
(gen_random_uuid(),'00000000-0000-0000-0002-000000000017',1,0,6),  -- B.Giami/Toledano    0-6  B.Cohen/Lévy
(gen_random_uuid(),'00000000-0000-0000-0002-000000000018',1,6,0),  -- Sala/Bismuth        6-0  R.Namias/J.Namias
(gen_random_uuid(),'00000000-0000-0000-0002-000000000019',1,6,0),  -- Nataf/Chiche        6-0  Arditti/Fellous
(gen_random_uuid(),'00000000-0000-0000-0002-000000000020',1,2,6),  -- Benmoussa/Gitton    2-6  A.Cohen/Fitussi

-- ROUND 3 (10h)
(gen_random_uuid(),'00000000-0000-0000-0003-000000000021',1,0,6),  -- Benjoar/Sarfati     0-6  Noblinski/Zerbib
(gen_random_uuid(),'00000000-0000-0000-0003-000000000022',1,2,6),  -- F.Berrebi/E.Berrebi 2-6  Sabban/Cattan
(gen_random_uuid(),'00000000-0000-0000-0003-000000000023',1,6,4),  -- Ayman/Sebag         6-4  Bedjai/Ouhioun
(gen_random_uuid(),'00000000-0000-0000-0003-000000000024',1,6,0),  -- Bajczman/Medard     6-0  M.Zribi/J.Zribi
(gen_random_uuid(),'00000000-0000-0000-0003-000000000025',1,2,6),  -- Azerraf/Botbol      2-6  Aboujed/Rose
(gen_random_uuid(),'00000000-0000-0000-0003-000000000026',1,1,6),  -- Amar/Seknadje       1-6  Benisty/Guenik
(gen_random_uuid(),'00000000-0000-0000-0003-000000000027',1,6,2),  -- Hazout/Marrache     6-2  B.Cohen/Lévy
(gen_random_uuid(),'00000000-0000-0000-0003-000000000028',1,6,1),  -- Mendelson/Boccara   6-1  R.Namias/J.Namias
(gen_random_uuid(),'00000000-0000-0000-0003-000000000029',1,6,3),  -- Narboni/Nahmias     6-3  Arditti/Fellous
(gen_random_uuid(),'00000000-0000-0000-0003-000000000030',1,6,2),  -- Mezrahi/Hackoun     6-2  A.Cohen/Fitussi

-- ROUND 4 (10h30)
(gen_random_uuid(),'00000000-0000-0000-0004-000000000031',1,6,0),  -- E.Giami/Slama       6-0  Benjoar/Sarfati
(gen_random_uuid(),'00000000-0000-0000-0004-000000000032',1,4,6),  -- B.Giami/Toledano    4-6  F.Berrebi/E.Berrebi
(gen_random_uuid(),'00000000-0000-0000-0004-000000000033',1,6,3),  -- Sala/Bismuth        6-3  Ayman/Sebag
(gen_random_uuid(),'00000000-0000-0000-0004-000000000034',1,4,6),  -- Nataf/Chiche        4-6  Bajczman/Medard
(gen_random_uuid(),'00000000-0000-0000-0004-000000000035',1,6,2),  -- Benmoussa/Gitton    6-2  Azerraf/Botbol
(gen_random_uuid(),'00000000-0000-0000-0004-000000000036',1,1,6),  -- Benisty/Guenik      1-6  Noblinski/Zerbib
(gen_random_uuid(),'00000000-0000-0000-0004-000000000037',1,6,3),  -- B.Cohen/Lévy        6-3  Sabban/Cattan
(gen_random_uuid(),'00000000-0000-0000-0004-000000000038',1,3,6),  -- R.Namias/J.Namias   3-6  Bedjai/Ouhioun
(gen_random_uuid(),'00000000-0000-0000-0004-000000000039',1,2,6),  -- Arditti/Fellous     2-6  M.Zribi/J.Zribi
(gen_random_uuid(),'00000000-0000-0000-0004-000000000040',1,3,6),  -- A.Cohen/Fitussi     3-6  Aboujed/Rose

-- ROUND 5 (11h)
(gen_random_uuid(),'00000000-0000-0000-0005-000000000041',1,6,0),  -- Amar/Seknadje       6-0  Benjoar/Sarfati
(gen_random_uuid(),'00000000-0000-0000-0005-000000000042',1,5,6),  -- Hazout/Marrache     5-6  F.Berrebi/E.Berrebi
(gen_random_uuid(),'00000000-0000-0000-0005-000000000043',1,6,3),  -- Mendelson/Boccara   6-3  Ayman/Sebag
(gen_random_uuid(),'00000000-0000-0000-0005-000000000044',1,4,6),  -- Narboni/Nahmias     4-6  Bajczman/Medard
(gen_random_uuid(),'00000000-0000-0000-0005-000000000045',1,6,0),  -- Mezrahi/Hackoun     6-0  Azerraf/Botbol
(gen_random_uuid(),'00000000-0000-0000-0005-000000000046',1,6,0),  -- E.Giami/Slama       6-0  Noblinski/Zerbib
(gen_random_uuid(),'00000000-0000-0000-0005-000000000047',1,1,6),  -- B.Giami/Toledano    1-6  Sabban/Cattan
(gen_random_uuid(),'00000000-0000-0000-0005-000000000048',1,6,2),  -- Sala/Bismuth        6-2  Bedjai/Ouhioun
(gen_random_uuid(),'00000000-0000-0000-0005-000000000049',1,6,0),  -- Nataf/Chiche        6-0  M.Zribi/J.Zribi
(gen_random_uuid(),'00000000-0000-0000-0005-000000000050',1,6,1);  -- Benmoussa/Gitton    6-1  Aboujed/Rose

COMMIT;
