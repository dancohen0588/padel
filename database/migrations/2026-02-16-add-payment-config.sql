-- Migration: Ajout de la configuration des paiements dans tournaments

-- Ajouter la colonne payment_config (JSON)
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS payment_config JSONB DEFAULT '{
    "enabled": false,
    "methods": {
      "bank": {
        "enabled": false,
        "iban": null,
        "bic": null
      },
      "lydia": {
        "enabled": false,
        "identifier": null
      },
      "revolut": {
        "enabled": false,
        "link": null,
        "tag": null
      },
      "wero": {
        "enabled": false,
        "identifier": null
      },
      "cash": {
        "enabled": false
      }
    },
    "confirmationEmail": null,
    "paymentDeadlineHours": 48
  }'::jsonb;

-- Commenter pour la documentation
COMMENT ON COLUMN public.tournaments.payment_config IS 'Configuration des moyens de paiement pour le tournoi (JSON)';
