-- Ajouter le statut waitlist, la date d'ajout et l'index associé

-- 1. Mettre à jour la contrainte CHECK du statut (colonne TEXT)
ALTER TABLE registrations
DROP CONSTRAINT IF EXISTS registrations_status_check;

ALTER TABLE registrations
ADD CONSTRAINT registrations_status_check
CHECK (status in ('pending', 'approved', 'rejected', 'waitlist'));

-- 2. Ajouter la colonne waitlist_added_at
ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS waitlist_added_at TIMESTAMP;

-- 3. Index pour optimiser l'ordre de la waitlist
CREATE INDEX IF NOT EXISTS idx_registrations_waitlist
ON registrations(tournament_id, status, waitlist_added_at)
WHERE status = 'waitlist';

-- 4. Commentaire
COMMENT ON COLUMN registrations.waitlist_added_at IS 'Date à laquelle le joueur a été mis en liste d''attente';
