create unique index if not exists idx_players_email_unique
on public.players (lower(email));

create unique index if not exists idx_registrations_unique
on public.registrations (tournament_id, player_id);
