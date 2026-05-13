-- ================================================================
-- TOURNOI SUPERLIGUE 19 AVRIL
-- Script : création des joueurs manquants + équipes
-- ================================================================
-- Règle placeholder : tout numéro de téléphone commençant par
-- '000000' est un numéro fictif (ex : 0000000112).
-- Pour retrouver tous les comptes placeholder :
--   SELECT * FROM public.players WHERE phone LIKE '000000%';
-- ================================================================

-- ----------------------------------------------------------------
-- ÉTAPE 1 : Joueurs manquants (25 nouveaux comptes placeholder)
-- ----------------------------------------------------------------
INSERT INTO public.players (first_name, last_name, phone) VALUES
  ('Alfonce',    'Alfonce',        '0000000112'),
  ('Benjamin',   'Bellaiche',      '0000000113'),
  ('Alexandre',  'Attali',         '0000000114'),
  ('Raphaël',    'Touboul',        '0000000115'),
  ('Alain',      'Alain',          '0000000116'),
  ('Ariel',      'Zeitoun',        '0000000117'),
  ('Mendel',     'Coppens',        '0000000118'),
  ('Mathis',     'Chhpindel',      '0000000119'),
  ('Alexandre',  'Ichou',          '0000000120'),
  ('Mickael',    'Certner',        '0000000121'),
  ('David',      'Layhani',        '0000000122'),
  ('Mickael',    'Israelovitch',   '0000000123'),
  ('Ilan',       'Anconina',       '0000000124'),
  ('Père',       'Benak',          '0000000125'),
  ('Fils',       'Benak',          '0000000126'),
  ('Mickael',    'Benmoussa',      '0000000127'),
  ('Sébastien',  'Mac Colott',     '0000000128'),
  ('Fabien',     'Lévy',           '0000000129'),
  ('Fils',       'Hackoun',        '0000000130'),
  ('Ugo',        'Zenou',          '0000000131'),
  ('Mickael',    'Bernardini',     '0000000132'),
  ('Gary',       'Cohen',          '0000000133'),
  ('Anthony',    'Bonin',          '0000000134'),
  ('Julien',     'Hababou',        '0000000135'),
  ('Lirone',     'Tordjman',       '0000000136')
ON CONFLICT DO NOTHING;


-- ----------------------------------------------------------------
-- ÉTAPE 2 : Création des équipes + binômes
-- Paires 13, 18 et 19 : partenaire TBD → joueur créé, pas d'équipe
-- ----------------------------------------------------------------
DO $$
DECLARE
  v_tid  uuid := 'aa829ff5-d838-4e5f-849c-51efddbb4d08';
  v_team uuid;
BEGIN

  -- Paire 1 : Harold Gitton / Thierry Cattan
  INSERT INTO public.teams (tournament_id, name) VALUES (v_tid, 'Gitton / Cattan') RETURNING id INTO v_team;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Harold' AND last_name='Gitton' LIMIT 1;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Thierry' AND last_name='Cattan' LIMIT 1;

  -- Paire 2 : Alfonce Alfonce / Zach Aboujed
  INSERT INTO public.teams (tournament_id, name) VALUES (v_tid, 'Alfonce / Aboujed') RETURNING id INTO v_team;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Alfonce' AND last_name='Alfonce' LIMIT 1;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Zach' AND last_name='Aboujed' LIMIT 1;

  -- Paire 3 : David Marrache / Benjamin Bellaiche
  INSERT INTO public.teams (tournament_id, name) VALUES (v_tid, 'Marrache / Bellaiche') RETURNING id INTO v_team;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='David' AND last_name='Marrache' LIMIT 1;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Benjamin' AND last_name='Bellaiche' LIMIT 1;

  -- Paire 4 : Alexandre Attali / Simon Ouhioun
  INSERT INTO public.teams (tournament_id, name) VALUES (v_tid, 'Attali / Ouhioun') RETURNING id INTO v_team;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Alexandre' AND last_name='Attali' LIMIT 1;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Simon' AND last_name='Ouhioun' LIMIT 1;

  -- Paire 5 : Cédric / Raphaël Touboul
  INSERT INTO public.teams (tournament_id, name) VALUES (v_tid, 'Cédric / Touboul') RETURNING id INTO v_team;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE phone='0000000110' LIMIT 1; -- Cédric (sans nom de famille)
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Raphaël' AND last_name='Touboul' LIMIT 1;

  -- Paire 6 : Gad Botbol / Alain Alain
  INSERT INTO public.teams (tournament_id, name) VALUES (v_tid, 'Botbol / Alain') RETURNING id INTO v_team;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Gad' AND last_name='Botbol' LIMIT 1;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Alain' AND last_name='Alain' LIMIT 1;

  -- Paire 7 : Matias Noblinski / Ariel Zeitoun
  INSERT INTO public.teams (tournament_id, name) VALUES (v_tid, 'Noblinski / Zeitoun') RETURNING id INTO v_team;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Matias' AND last_name='Noblinski' LIMIT 1;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Ariel' AND last_name='Zeitoun' LIMIT 1;

  -- Paire 8 : Lionel Benmoussa / Mendel Coppens
  INSERT INTO public.teams (tournament_id, name) VALUES (v_tid, 'Benmoussa / Coppens') RETURNING id INTO v_team;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Lionel' AND last_name='Benmoussa' LIMIT 1;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Mendel' AND last_name='Coppens' LIMIT 1;

  -- Paire 9 : Kévin Bedjai / Mathis Chhpindel
  INSERT INTO public.teams (tournament_id, name) VALUES (v_tid, 'Bedjai / Chhpindel') RETURNING id INTO v_team;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE last_name='Bedjai' LIMIT 1;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Mathis' AND last_name='Chhpindel' LIMIT 1;

  -- Paire 10 : Charles Amar / Joan Seknadje
  INSERT INTO public.teams (tournament_id, name) VALUES (v_tid, 'Amar / Seknadje') RETURNING id INTO v_team;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Charles' AND last_name='Amar' LIMIT 1;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Joan' AND last_name='Seknadje' LIMIT 1;

  -- Paire 11 : Zack Sabban / Alexandre Ichou
  INSERT INTO public.teams (tournament_id, name) VALUES (v_tid, 'Sabban / Ichou') RETURNING id INTO v_team;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Zack' AND last_name='Sabban' LIMIT 1;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Alexandre' AND last_name='Ichou' LIMIT 1;

  -- Paire 12 : Anthony Danan / Mickael Certner
  INSERT INTO public.teams (tournament_id, name) VALUES (v_tid, 'Danan / Certner') RETURNING id INTO v_team;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Anthony' AND last_name ILIKE 'Danan' LIMIT 1;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Mickael' AND last_name='Certner' LIMIT 1;

  -- Paire 13 : David Layhani / <Partenaire à ajouter> — équipe non créée

  -- Paire 14 : Lucas Narboni / Mickael Israelovitch
  INSERT INTO public.teams (tournament_id, name) VALUES (v_tid, 'Narboni / Israelovitch') RETURNING id INTO v_team;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Lucas' AND last_name='Narboni' LIMIT 1;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Mickael' AND last_name='Israelovitch' LIMIT 1;

  -- Paire 15 : Ruben Bajczman / Ilan Anconina
  INSERT INTO public.teams (tournament_id, name) VALUES (v_tid, 'Bajczman / Anconina') RETURNING id INTO v_team;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Ruben' AND last_name='Bajczman' LIMIT 1;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Ilan' AND last_name='Anconina' LIMIT 1;

  -- Paire 16 : Père Benak / Fils Benak
  INSERT INTO public.teams (tournament_id, name) VALUES (v_tid, 'Benak / Benak') RETURNING id INTO v_team;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Père' AND last_name='Benak' LIMIT 1;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Fils' AND last_name='Benak' LIMIT 1;

  -- Paire 17 : Mickael Benmoussa / Sébastien Mac Colott
  INSERT INTO public.teams (tournament_id, name) VALUES (v_tid, 'Benmoussa / Mac Colott') RETURNING id INTO v_team;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Mickael' AND last_name='Benmoussa' LIMIT 1;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Sébastien' AND last_name='Mac Colott' LIMIT 1;

  -- Paire 18 : Teddy Benisty / <Partenaire à ajouter> — équipe non créée
  -- Paire 19 : Fabien Lévy / <Partenaire à ajouter> — équipe non créée

  -- Paire 20 : Olivier Hackoun / Fils Hackoun
  INSERT INTO public.teams (tournament_id, name) VALUES (v_tid, 'Hackoun / Hackoun') RETURNING id INTO v_team;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Olivier' AND last_name='Hackoun' LIMIT 1;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Fils' AND last_name='Hackoun' LIMIT 1;

  -- Paire 21 : Ewan Toledano / Ugo Zenou
  INSERT INTO public.teams (tournament_id, name) VALUES (v_tid, 'Toledano / Zenou') RETURNING id INTO v_team;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Ewan' AND last_name='Toledano' LIMIT 1;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Ugo' AND last_name='Zenou' LIMIT 1;

  -- Paire 22 : Mickael Bernardini / Gary Cohen
  INSERT INTO public.teams (tournament_id, name) VALUES (v_tid, 'Bernardini / Cohen') RETURNING id INTO v_team;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Mickael' AND last_name='Bernardini' LIMIT 1;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Gary' AND last_name='Cohen' LIMIT 1;

  -- Paire 23 : Ben Cohen / Anthony Bonin
  INSERT INTO public.teams (tournament_id, name) VALUES (v_tid, 'Cohen / Bonin') RETURNING id INTO v_team;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Ben' AND last_name='Cohen' LIMIT 1;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Anthony' AND last_name='Bonin' LIMIT 1;

  -- Paire 24 : Victor Hazout / Zach Sebag
  INSERT INTO public.teams (tournament_id, name) VALUES (v_tid, 'Hazout / Sebag') RETURNING id INTO v_team;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Victor' AND last_name='Hazout' LIMIT 1;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Zach' AND last_name='Sebag' LIMIT 1;

  -- Paire 25 : Julien Hababou / Lirone Tordjman
  INSERT INTO public.teams (tournament_id, name) VALUES (v_tid, 'Hababou / Tordjman') RETURNING id INTO v_team;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Julien' AND last_name='Hababou' LIMIT 1;
  INSERT INTO public.team_players (team_id, player_id) SELECT v_team, id FROM public.players WHERE first_name='Lirone' AND last_name='Tordjman' LIMIT 1;

END $$;
