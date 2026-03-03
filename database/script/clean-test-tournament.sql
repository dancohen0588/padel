-- ============================================================
-- Nettoyage : suppression du tournoi slug='test' et de ses joueurs
-- ============================================================

DO $$
DECLARE
  v_tournament_id uuid;
BEGIN

  SELECT id INTO v_tournament_id
  FROM public.tournaments
  WHERE slug = 'test';

  IF v_tournament_id IS NULL THEN
    RAISE NOTICE 'Tournoi slug="test" introuvable, rien à supprimer.';
    RETURN;
  END IF;

  -- Suppression des joueurs inscrits à ce tournoi
  -- (ON DELETE CASCADE gère registrations, team_players, pool_teams en cascade)
  DELETE FROM public.players
  WHERE id IN (
    SELECT player_id
    FROM public.registrations
    WHERE tournament_id = v_tournament_id
  );

  -- Suppression du tournoi (cascade sur teams, pools, matches, etc.)
  DELETE FROM public.tournaments
  WHERE id = v_tournament_id;

  RAISE NOTICE 'Tournoi "%" et ses joueurs supprimés.', v_tournament_id;

END $$;
