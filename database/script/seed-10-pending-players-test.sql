-- ============================================================
-- Seed : 10 joueurs en statut "pending" (à valider)
-- Tournoi : slug = 'test'
-- ============================================================

DO $$
DECLARE
  v_tournament_id uuid;
BEGIN

  -- Récupération de l'ID du tournoi
  SELECT id INTO v_tournament_id
  FROM public.tournaments
  WHERE slug = 'test';

  IF v_tournament_id IS NULL THEN
    RAISE EXCEPTION 'Tournoi avec slug="test" introuvable.';
  END IF;

  -- Insertion des 10 joueurs + inscriptions
  WITH new_players AS (
    INSERT INTO public.players (first_name, last_name, email, phone, level, play_preference)
    VALUES
      ('Lucas',    'Martin',    'lucas.martin@test.com',    '0601010101', 'intermédiaire', 'droite'),
      ('Emma',     'Dupont',    'emma.dupont@test.com',     '0602020202', 'débutant',      'gauche'),
      ('Thomas',   'Bernard',   'thomas.bernard@test.com',  '0603030303', 'avancé',        'droite'),
      ('Léa',      'Petit',     'lea.petit@test.com',       '0604040404', 'intermédiaire', 'aucune'),
      ('Hugo',     'Robert',    'hugo.robert@test.com',     '0605050505', 'débutant',      'droite'),
      ('Camille',  'Richard',   'camille.richard@test.com', '0606060606', 'avancé',        'gauche'),
      ('Nathan',   'Durand',    'nathan.durand@test.com',   '0607070707', 'intermédiaire', 'droite'),
      ('Manon',    'Leroy',     'manon.leroy@test.com',     '0608080808', 'débutant',      'aucune'),
      ('Maxime',   'Moreau',    'maxime.moreau@test.com',   '0609090909', 'avancé',        'droite'),
      ('Chloé',    'Simon',     'chloe.simon@test.com',     '0610101010', 'intermédiaire', 'gauche')
    RETURNING id
  )
  INSERT INTO public.registrations (tournament_id, player_id, status)
  SELECT v_tournament_id, id, 'pending'
  FROM new_players;

  RAISE NOTICE '10 joueurs inscrits en statut pending pour le tournoi "%".', v_tournament_id;

END $$;
