insert into public.tournaments (name, date, status, slug, location, description, max_players, image_path, config)
values (
  'Tournoi du mois',
  current_date,
  'published',
  'tournoi-du-mois',
  'Paris',
  'Tournoi urbain padel',
  32,
  '/images/tournaments/tournoi-du-mois.jpg',
  '{"pairing_mode":"balanced","pools_count":4,"playoffs":{"enabled":true,"teams_qualified":8,"format":"single_elim","has_third_place":false}}'::jsonb
);

insert into public.tournament_photos (tournament_id, url, caption, featured)
values
  ((select id from public.tournaments limit 1), 'https://images.unsplash.com/photo-1517649763962-0c623066013b', 'Match serré sur le court central', true),
  ((select id from public.tournaments limit 1), 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee', 'Focus sur la volée gagnante', true),
  ((select id from public.tournaments limit 1), 'https://images.unsplash.com/photo-1521412644187-c49fa049e84d', 'Après-match, vibes crew', false);
