-- ================================================================
-- TOURNOI SUPERLIGUE 19 AVRIL
-- Script : inscription de tous les joueurs (table registrations)
-- Statut : 'approved' (inscription admin directe)
-- ================================================================

DO $$
DECLARE
  v_tid uuid := 'aa829ff5-d838-4e5f-849c-51efddbb4d08';
BEGIN

  -- Joueurs identifiables par (first_name, last_name)
  INSERT INTO public.registrations (tournament_id, player_id, status, payment_status)
  SELECT DISTINCT v_tid, id, 'approved', false
  FROM public.players
  WHERE (first_name, last_name) IN (
    ('Harold',    'Gitton'),
    ('Thierry',   'Cattan'),
    ('Alfonce',   'Alfonce'),
    ('Zach',      'Aboujed'),
    ('David',     'Marrache'),
    ('Benjamin',  'Bellaiche'),
    ('Alexandre', 'Attali'),
    ('Simon',     'Ouhioun'),
    ('Raphaël',   'Touboul'),
    ('Gad',       'Botbol'),
    ('Alain',     'Alain'),
    ('Matias',    'Noblinski'),
    ('Ariel',     'Zeitoun'),
    ('Lionel',    'Benmoussa'),
    ('Mendel',    'Coppens'),
    ('Mathis',    'Chhpindel'),
    ('Charles',   'Amar'),
    ('Joan',      'Seknadje'),
    ('Zack',      'Sabban'),
    ('Alexandre', 'Ichou'),
    ('Mickael',   'Certner'),
    ('David',     'Layhani'),
    ('Lucas',     'Narboni'),
    ('Mickael',   'Israelovitch'),
    ('Ruben',     'Bajczman'),
    ('Ilan',      'Anconina'),
    ('Père',      'Benak'),
    ('Fils',      'Benak'),
    ('Mickael',   'Benmoussa'),
    ('Sébastien', 'Mac Colott'),
    ('Teddy',     'Benisty'),
    ('Fabien',    'Lévy'),
    ('Olivier',   'Hackoun'),
    ('Fils',      'Hackoun'),
    ('Ewan',      'Toledano'),
    ('Ugo',       'Zenou'),
    ('Mickael',   'Bernardini'),
    ('Gary',      'Cohen'),
    ('Ben',       'Cohen'),
    ('Anthony',   'Bonin'),
    ('Victor',    'Hazout'),
    ('Zach',      'Sebag'),
    ('Julien',    'Hababou'),
    ('Lirone',    'Tordjman')
  )
  ON CONFLICT DO NOTHING;

  -- Kévin Bedjai (accent variable sur le prénom)
  INSERT INTO public.registrations (tournament_id, player_id, status, payment_status)
  SELECT v_tid, id, 'approved', false
  FROM public.players WHERE last_name = 'Bedjai'
  LIMIT 1
  ON CONFLICT DO NOTHING;

  -- Anthony Danan (stocké 'DANAN' en base)
  INSERT INTO public.registrations (tournament_id, player_id, status, payment_status)
  SELECT v_tid, id, 'approved', false
  FROM public.players WHERE first_name = 'Anthony' AND last_name ILIKE 'Danan'
  LIMIT 1
  ON CONFLICT DO NOTHING;

  -- Cédric sans nom de famille (identifié par son numéro placeholder)
  INSERT INTO public.registrations (tournament_id, player_id, status, payment_status)
  SELECT v_tid, id, 'approved', false
  FROM public.players WHERE phone = '0000000110'
  ON CONFLICT DO NOTHING;

END $$;
