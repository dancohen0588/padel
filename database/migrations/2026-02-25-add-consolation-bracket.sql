-- Ajout du champ bracket_type sur playoff_rounds pour distinguer
-- le tableau principal ('main') du tableau consolante ('consolation').
-- Les rounds existants reçoivent automatiquement la valeur 'main'.

ALTER TABLE playoff_rounds
  ADD COLUMN IF NOT EXISTS bracket_type TEXT NOT NULL DEFAULT 'main';
