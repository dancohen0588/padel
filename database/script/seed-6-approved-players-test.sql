-- ============================================================
-- Seed : 6 joueurs en statut "approved" (validés)
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

  -- Insertion des 6 joueurs + inscriptions approuvées
  WITH new_players AS (
    INSERT INTO public.players (first_name, last_name, email, phone, level, play_preference)
    VALUES
      ('Antoine',  'Lefebvre',  'antoine.lefebvre@test.com',  '0611111111', 'avancé',        'droite'),
      ('Sophie',   'Garnier',   'sophie.garnier@test.com',    '0622222222', 'intermédiaire', 'gauche'),
      ('Julien',   'Fontaine',  'julien.fontaine@test.com',   '0633333333', 'avancé',        'droite'),
      ('Clara',    'Rousseau',  'clara.rousseau@test.com',    '0644444444', 'intermédiaire', 'aucune'),
      ('Nicolas',  'Blanc',     'nicolas.blanc@test.com',     '0655555555', 'avancé',        'gauche'),
      ('Inès',     'Chevalier', 'ines.chevalier@test.com',    '0666666666', 'débutant',      'droite')
    RETURNING id
  )
  INSERT INTO public.registrations (tournament_id, player_id, status)
  SELECT v_tournament_id, id, 'approved'
  FROM new_players;

  RAISE NOTICE '6 joueurs inscrits en statut approved pour le tournoi "%".', v_tournament_id;

END $$;
