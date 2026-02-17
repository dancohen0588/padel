-- ============================================================
-- SCHEMA FINAL — Le Tournoi des Frérots
-- Mis à jour le 2026-02-17
-- Source de vérité unique — remplace schema.sql + toutes les migrations
-- Compatible Supabase (postgres.js avec prepare: false)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TOURNAMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tournaments (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                text UNIQUE,
  name                text NOT NULL,
  date                date NOT NULL,
  location            text,
  description         text,
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','published','archived','upcoming','registration','ongoing')),
  max_players         int,
  image_path          text,
  config              jsonb NOT NULL DEFAULT '{}'::jsonb,
  price               DECIMAL(10, 2) DEFAULT 0,
  payment_config      jsonb DEFAULT '{
    "enabled": false,
    "methods": {
      "bank":    { "enabled": false, "iban": null, "bic": null },
      "lydia":   { "enabled": false, "identifier": null },
      "revolut": { "enabled": false, "link": null, "tag": null },
      "wero":    { "enabled": false, "identifier": null },
      "cash":    { "enabled": false }
    },
    "confirmationEmail": null,
    "paymentDeadlineHours": 48
  }'::jsonb,
  whatsapp_group_link text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tournaments_price_positive CHECK (price IS NULL OR price >= 0)
);

COMMENT ON COLUMN public.tournaments.price               IS 'Prix d''inscription au tournoi en euros';
COMMENT ON COLUMN public.tournaments.payment_config      IS 'Configuration des moyens de paiement pour le tournoi (JSON)';
COMMENT ON COLUMN public.tournaments.whatsapp_group_link IS 'Lien d''invitation au groupe WhatsApp du tournoi';

-- ============================================================
-- PLAYERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.players (
  id                          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name                  text NOT NULL,
  last_name                   text NOT NULL,
  email                       text,           -- nullable, phone est l'identifiant principal
  phone                       text NOT NULL,
  level                       text,
  photo_url                   text,
  photo_path                  text,
  pair_with                   text,
  is_ranked                   boolean DEFAULT FALSE,
  ranking                     text,
  play_preference             text CHECK (play_preference IN ('droite', 'gauche', 'aucune')),
  whatsapp_joined_tournaments jsonb DEFAULT '[]'::jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.players.pair_with                   IS 'Nom du binôme souhaité';
COMMENT ON COLUMN public.players.whatsapp_joined_tournaments IS 'Liste des IDs de tournois pour lesquels le joueur a cliqué sur "Rejoindre WhatsApp"';

-- ============================================================
-- REGISTRATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.registrations (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id     uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id         uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected','waitlist')),
  payment_status    boolean DEFAULT FALSE,
  payment_method    varchar(50),
  payment_date      timestamp,
  waitlist_added_at timestamp,
  registered_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, player_id)
);

COMMENT ON COLUMN public.registrations.payment_status    IS 'Indique si le joueur a payé son inscription';
COMMENT ON COLUMN public.registrations.payment_method    IS 'Moyen de paiement utilisé (bank, lydia, revolut, wero, cash)';
COMMENT ON COLUMN public.registrations.payment_date      IS 'Date à laquelle le paiement a été marqué comme payé';
COMMENT ON COLUMN public.registrations.waitlist_added_at IS 'Date à laquelle le joueur a été mis en liste d''attente';

-- ============================================================
-- TEAMS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.teams (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name          text,
  is_seeded     boolean DEFAULT FALSE,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_players (
  team_id    uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id  uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, player_id)
);

-- ============================================================
-- POOLS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pools (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name          text NOT NULL,
  pool_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pool_teams (
  pool_id    uuid NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
  team_id    uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pool_id, team_id)
);

-- ============================================================
-- MATCHES (poules)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.matches (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id  uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  pool_id        uuid REFERENCES public.pools(id) ON DELETE SET NULL,
  team_a_id      uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team_b_id      uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  status         text NOT NULL DEFAULT 'upcoming'
                   CHECK (status IN ('upcoming', 'live', 'finished')),
  scheduled_at   timestamptz,
  winner_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  sets_won_a     int NOT NULL DEFAULT 0,
  sets_won_b     int NOT NULL DEFAULT 0,
  games_won_a    int NOT NULL DEFAULT 0,
  games_won_b    int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (team_a_id <> team_b_id)
);

CREATE TABLE IF NOT EXISTS public.match_sets (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id     uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  set_order    int NOT NULL CHECK (set_order BETWEEN 1 AND 5),
  team_a_games int NOT NULL DEFAULT 0,
  team_b_games int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, set_order)
);

-- ============================================================
-- PHASES FINALES (playoffs)
-- Noms de colonnes réels utilisés dans le code :
--   playoff_matches : winner_id, scheduled_at, next_match_id, next_match_position
--   playoff_sets    : team1_score, team2_score, set_number
-- ============================================================

CREATE TABLE IF NOT EXISTS public.playoff_rounds (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_number  int NOT NULL,
  round_name    text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.playoff_matches (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id        uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_id             uuid REFERENCES public.playoff_rounds(id) ON DELETE CASCADE,
  match_number         int,
  team1_id             uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  team2_id             uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  team1_seed           int,
  team2_seed           int,
  winner_id            uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  scheduled_at         timestamptz,
  next_match_id        uuid REFERENCES public.playoff_matches(id) ON DELETE SET NULL,
  next_match_position  int,
  status               text NOT NULL DEFAULT 'upcoming'
                         CHECK (status IN ('upcoming', 'live', 'finished', 'completed')),
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.playoff_sets (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id     uuid NOT NULL REFERENCES public.playoff_matches(id) ON DELETE CASCADE,
  set_number   int NOT NULL CHECK (set_number BETWEEN 1 AND 5),
  team1_score  int NOT NULL DEFAULT 0,
  team2_score  int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, set_number)
);

-- ============================================================
-- PHOTOS & MÉDIAS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tournament_photos (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE SET NULL,
  url           text NOT NULL,
  caption       text,
  featured      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.home_config (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cover_photo_url  text,
  cover_photo_path text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.home_config (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.home_gallery (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_url     text NOT NULL,
  photo_path    text NOT NULL,
  caption       text,
  display_order int NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PAIEMENTS (configuration globale)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_config (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  config     jsonb NOT NULL DEFAULT '{
    "enabled": false,
    "methods": {
      "bank":    { "enabled": false, "iban": null, "bic": null },
      "lydia":   { "enabled": false, "identifier": null },
      "revolut": { "enabled": false, "link": null, "tag": null },
      "wero":    { "enabled": false, "identifier": null },
      "cash":    { "enabled": false }
    },
    "confirmationEmail": null,
    "paymentDeadlineHours": 48
  }'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.payment_config (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE  public.payment_config        IS 'Configuration globale des moyens de paiement.';
COMMENT ON COLUMN public.payment_config.config IS 'JSON de configuration des paiements.';

-- ============================================================
-- ADMINS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admins (
  user_id uuid PRIMARY KEY
);

-- ============================================================
-- FONCTIONS
-- ============================================================

-- Normalisation du numéro de téléphone français
-- (nécessaire pour Supabase qui n'accepte pas CASE inline dans les index)
CREATE OR REPLACE FUNCTION public.normalize_phone(phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN phone ~ '^\+33' THEN '0' || regexp_replace(substring(phone FROM 4), '[^0-9]', '', 'g')
    ELSE regexp_replace(phone, '[^0-9]', '', 'g')
  END;
$$;

-- ============================================================
-- INDEX
-- ============================================================

-- Players
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_phone_unique
  ON public.players (public.normalize_phone(phone));

CREATE INDEX IF NOT EXISTS idx_players_email_partial
  ON public.players (lower(email))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_players_whatsapp_tournaments
  ON public.players USING gin (whatsapp_joined_tournaments);

-- Registrations
CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_unique
  ON public.registrations (tournament_id, player_id);

CREATE INDEX IF NOT EXISTS idx_registrations_payment
  ON public.registrations (tournament_id, payment_status, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_registrations_waitlist
  ON public.registrations (tournament_id, status, waitlist_added_at)
  WHERE status = 'waitlist';

-- Matches
CREATE INDEX IF NOT EXISTS matches_tournament_id_idx ON public.matches (tournament_id);
CREATE INDEX IF NOT EXISTS matches_pool_id_idx       ON public.matches (pool_id);
CREATE INDEX IF NOT EXISTS match_sets_match_id_idx   ON public.match_sets (match_id);

-- Teams
CREATE INDEX IF NOT EXISTS idx_teams_seeded
  ON public.teams (tournament_id, is_seeded)
  WHERE is_seeded = TRUE;

-- Home gallery
CREATE INDEX IF NOT EXISTS idx_home_gallery_order  ON public.home_gallery (display_order);
CREATE INDEX IF NOT EXISTS idx_home_gallery_active ON public.home_gallery (is_active);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.tournaments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_players      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pools             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_sets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playoff_rounds    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playoff_matches   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playoff_sets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_config       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_gallery      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_config    ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES
-- ============================================================

CREATE POLICY "public approved players"
  ON public.registrations FOR SELECT
  USING (status = 'approved');

CREATE POLICY "public tournament photos"
  ON public.tournament_photos FOR SELECT
  USING (true);

CREATE POLICY "public home gallery"
  ON public.home_gallery FOR SELECT
  USING (is_active = true);

CREATE POLICY "public home config"
  ON public.home_config FOR SELECT
  USING (true);

-- ============================================================
-- VUES
-- ============================================================

DROP VIEW IF EXISTS public.player_stats;

CREATE VIEW public.player_stats AS
SELECT
  p.id                                                    AS player_id,
  p.first_name,
  p.last_name,
  p.email,
  p.phone,
  p.level,
  p.is_ranked,
  p.ranking,
  p.play_preference,
  count(r.id)                                             AS tournaments_played,
  count(*) FILTER (WHERE r.status = 'approved')          AS approved_registrations,
  max(r.registered_at)                                    AS last_registered_at
FROM public.players p
LEFT JOIN public.registrations r ON r.player_id = p.id
GROUP BY p.id;

GRANT SELECT ON public.player_stats TO anon, authenticated;