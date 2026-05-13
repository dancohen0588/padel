-- ================================================================
-- FIX : Supprimer le doublon Zack Sabban + Ajouter Zack Sebag
-- ================================================================

-- 1. Supprimer la registration du Zack Sabban placeholder (phone 0000000101)
--    Le vrai Zack Sabban (phone 0681861393) reste inscrit.
DELETE FROM public.registrations
WHERE tournament_id = 'aa829ff5-d838-4e5f-849c-51efddbb4d08'
  AND player_id = (
    SELECT id FROM public.players
    WHERE first_name = 'Zack' AND last_name = 'Sabban' AND phone = '0000000101'
  );

-- 2. Inscrire Zack Sebag (id connu : e21ee07b-78e7-4370-ae2b-228f190dbd35)
INSERT INTO public.registrations (tournament_id, player_id, status, payment_status)
VALUES (
  'aa829ff5-d838-4e5f-849c-51efddbb4d08',
  'e21ee07b-78e7-4370-ae2b-228f190dbd35',
  'approved',
  false
)
ON CONFLICT DO NOTHING;
