-- Migration: Phone as primary identifier instead of email

-- 1. Ajouter les nouveaux champs au modèle Player
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS is_ranked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ranking TEXT,
  ADD COLUMN IF NOT EXISTS play_preference TEXT CHECK (play_preference IN ('droite', 'gauche', 'aucune'));

-- 2. Modifier la colonne email pour la rendre nullable
ALTER TABLE public.players
  ALTER COLUMN email DROP NOT NULL;

-- 3. Modifier la colonne phone pour la rendre obligatoire
-- ATTENTION: Si des données existantes n'ont pas de téléphone, il faut d'abord les nettoyer
UPDATE public.players SET phone = 'migration-' || id::text WHERE phone IS NULL OR phone = '';
ALTER TABLE public.players
  ALTER COLUMN phone SET NOT NULL;

-- 4. Supprimer l'ancien index unique sur email
DROP INDEX IF EXISTS idx_players_email_unique;

-- 5. Créer un index unique sur le téléphone normalisé
-- On utilise une fonction pour normaliser le téléphone (enlever espaces, points, remplacer +33 par 0)
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_phone_unique
ON public.players (
  CASE
    WHEN phone ~ '^\+33' THEN '0' || regexp_replace(substring(phone from 4), '[^0-9]', '', 'g')
    ELSE regexp_replace(phone, '[^0-9]', '', 'g')
  END
);

-- 6. Créer un index partiel sur email pour les emails non nuls (permettre les emails dupliqués si NULL)
CREATE INDEX IF NOT EXISTS idx_players_email_partial
ON public.players (lower(email))
WHERE email IS NOT NULL;

-- 7. Mettre à jour la vue player_stats pour inclure les nouveaux champs
DROP VIEW IF EXISTS public.player_stats;

CREATE VIEW public.player_stats AS
SELECT
  p.id as player_id,
  p.first_name,
  p.last_name,
  p.email,
  p.phone,
  p.level,
  p.is_ranked,
  p.ranking,
  p.play_preference,
  count(r.id) as tournaments_played,
  count(*) filter (where r.status = 'approved') as approved_registrations,
  max(r.registered_at) as last_registered_at
FROM public.players p
LEFT JOIN public.registrations r on r.player_id = p.id
GROUP BY p.id;
