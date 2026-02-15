-- Migration: Ajout du champ prix aux tournois

-- Ajouter la colonne price à la table tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) DEFAULT 0;

-- Commenter la colonne pour la documentation
COMMENT ON COLUMN public.tournaments.price IS 'Prix d''inscription au tournoi en euros';

-- Ajouter une contrainte pour s'assurer que le prix est positif ou nul
ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_price_positive CHECK (price IS NULL OR price >= 0);
