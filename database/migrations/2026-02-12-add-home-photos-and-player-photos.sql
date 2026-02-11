create table if not exists public.home_config (
  id uuid primary key default uuid_generate_v4(),
  cover_photo_url text,
  cover_photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.home_config (id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

create table if not exists public.home_gallery (
  id uuid primary key default uuid_generate_v4(),
  photo_url text not null,
  photo_path text not null,
  caption text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_home_gallery_order on public.home_gallery (display_order);
create index if not exists idx_home_gallery_active on public.home_gallery (is_active);

alter table public.players
  add column if not exists photo_url text,
  add column if not exists photo_path text;

alter table public.home_config enable row level security;
alter table public.home_gallery enable row level security;

create policy "public home gallery"
on public.home_gallery
for select
using (is_active = true);

create policy "public home config"
on public.home_config
for select
using (true);
