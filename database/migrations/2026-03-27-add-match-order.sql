-- Ajoute un champ d'ordre pour contrôler l'affichage des matchs dans les poules
-- Permet de trier les matchs par "round logique" afin de minimiser les temps d'attente

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS match_order int;

-- Les matchs existants reçoivent un ordre par défaut basé sur leur date de création
UPDATE public.matches
SET match_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY pool_id ORDER BY created_at ASC) AS rn
  FROM public.matches
  WHERE pool_id IS NOT NULL
) sub
WHERE public.matches.id = sub.id;
