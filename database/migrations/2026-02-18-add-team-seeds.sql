ALTER TABLE teams
ADD COLUMN IF NOT EXISTS is_seeded BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_teams_seeded
ON teams (tournament_id, is_seeded)
WHERE is_seeded = TRUE;
