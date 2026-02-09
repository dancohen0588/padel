create table if not exists public.teams (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists public.team_players (
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, player_id)
);

create table if not exists public.pools (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  pool_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.pool_teams (
  pool_id uuid not null references public.pools(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (pool_id, team_id)
);

alter table public.teams enable row level security;
alter table public.team_players enable row level security;
alter table public.pools enable row level security;
alter table public.pool_teams enable row level security;
