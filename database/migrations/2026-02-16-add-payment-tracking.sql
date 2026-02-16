-- 1. Ajouter les colonnes de tracking du paiement
ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS payment_status BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP;

-- 2. Index pour optimiser les requêtes de paiement
CREATE INDEX IF NOT EXISTS idx_registrations_payment
ON registrations(tournament_id, payment_status, payment_date DESC);

-- 3. Commentaires
COMMENT ON COLUMN registrations.payment_status IS 'Indique si le joueur a payé son inscription';
COMMENT ON COLUMN registrations.payment_method IS 'Moyen de paiement utilisé (bank, lydia, revolut, wero, cash)';
COMMENT ON COLUMN registrations.payment_date IS 'Date à laquelle le paiement a été marqué comme payé';
