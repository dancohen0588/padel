-- Add an optional "surnom" (nickname) column to the players table.

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS surnom text;

COMMENT ON COLUMN public.players.surnom IS 'Surnom du joueur (optionnel)';
