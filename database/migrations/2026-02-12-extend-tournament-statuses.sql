alter table public.tournaments
  drop constraint if exists tournaments_status_check;

alter table public.tournaments
  add constraint tournaments_status_check
  check (status in ('draft', 'published', 'archived', 'upcoming', 'registration', 'ongoing'));
