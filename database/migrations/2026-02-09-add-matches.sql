create table if not exists public.matches (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  pool_id uuid references public.pools(id) on delete set null,
  team_a_id uuid not null references public.teams(id) on delete cascade,
  team_b_id uuid not null references public.teams(id) on delete cascade,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'finished')),
  scheduled_at timestamptz,
  winner_team_id uuid references public.teams(id) on delete set null,
  sets_won_a int not null default 0,
  sets_won_b int not null default 0,
  games_won_a int not null default 0,
  games_won_b int not null default 0,
  created_at timestamptz not null default now(),
  check (team_a_id <> team_b_id)
);

create table if not exists public.match_sets (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches(id) on delete cascade,
  set_order int not null check (set_order between 1 and 5),
  team_a_games int not null default 0,
  team_b_games int not null default 0,
  created_at timestamptz not null default now(),
  unique (match_id, set_order)
);

create index if not exists matches_tournament_id_idx on public.matches (tournament_id);
create index if not exists matches_pool_id_idx on public.matches (pool_id);
create index if not exists match_sets_match_id_idx on public.match_sets (match_id);

alter table public.matches enable row level security;
alter table public.match_sets enable row level security;
