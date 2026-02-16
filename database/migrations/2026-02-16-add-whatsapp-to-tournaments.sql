-- Migration: Ajout du lien WhatsApp aux tournois et tracking des clics

-- 1. Ajouter le champ whatsapp_group_link aux tournois
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS whatsapp_group_link TEXT;

COMMENT ON COLUMN public.tournaments.whatsapp_group_link IS 'Lien d''invitation au groupe WhatsApp du tournoi';

-- 2. Ajouter le tracking des clics WhatsApp aux joueurs
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS whatsapp_joined_tournaments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.players.whatsapp_joined_tournaments IS 'Liste des IDs de tournois pour lesquels le joueur a cliqué sur "Rejoindre WhatsApp"';

-- 3. Créer un index pour rechercher rapidement si un joueur a rejoint un groupe
CREATE INDEX IF NOT EXISTS idx_players_whatsapp_tournaments
ON public.players USING gin (whatsapp_joined_tournaments);
