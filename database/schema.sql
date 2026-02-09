create extension if not exists "uuid-ossp";

create table if not exists public.tournaments (
  id uuid primary key default uuid_generate_v4(),
  slug text unique,
  name text not null,
  date date not null,
  location text,
  description text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  max_players int,
  image_path text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  email text not null unique,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.registrations (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  registered_at timestamptz not null default now(),
  unique (tournament_id, player_id)
);

create view public.player_stats as
select
  p.id as player_id,
  p.first_name,
  p.last_name,
  p.email,
  count(r.id) as tournaments_played,
  count(*) filter (where r.status = 'approved') as approved_registrations,
  max(r.registered_at) as last_registered_at
from public.players p
left join public.registrations r on r.player_id = p.id
group by p.id;

create table if not exists public.tournament_photos (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid references public.tournaments(id) on delete set null,
  url text not null,
  caption text,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

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

create table if not exists public.admins (
  user_id uuid primary key
);

alter table public.tournaments enable row level security;
alter table public.players enable row level security;
alter table public.registrations enable row level security;
alter table public.tournament_photos enable row level security;
alter table public.teams enable row level security;
alter table public.team_players enable row level security;
alter table public.pools enable row level security;
alter table public.pool_teams enable row level security;
alter table public.admins enable row level security;

create policy "public approved players"
on public.registrations
for select
using (status = 'approved');

create policy "public tournament photos"
on public.tournament_photos
for select
using (true);

grant select on public.player_stats to anon, authenticated;
