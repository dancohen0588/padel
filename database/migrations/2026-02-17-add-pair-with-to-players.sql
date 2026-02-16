-- Migration: Ajouter le champ pair_with à la table players
-- Date: 2026-02-17
-- Description: Permet d'indiquer avec qui un joueur souhaite jouer en binôme

ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS pair_with TEXT;

COMMENT ON COLUMN public.players.pair_with IS 'Nom du binôme souhaité (rempli manuellement en solo ou automatiquement en inscription binôme)';
