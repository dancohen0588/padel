do $$
declare
  v_tournament_id uuid;
  v_player_ids uuid[];
  v_team_ids uuid[];
  v_index int;
begin
  select id
  into v_tournament_id
  from tournaments
  where name = 'Test 4'
  limit 1;

  if v_tournament_id is null then
    raise exception 'Tournoi "Test 4" introuvable';
  end if;

  with inserted as (
    insert into players (first_name, last_name, email, phone)
    select
      format('Joueur %s', gs),
      format('Test3 %s', gs),
      format('test3-joueur-%s@example.com', lpad(gs::text, 2, '0')),
      format('+33 6 00 00 %s', lpad(gs::text, 2, '0'))
    from generate_series(1, 48) gs
    returning id, email
  ),
  ordered as (
    select id, row_number() over (order by email) as rn
    from inserted
  )
  select array_agg(id order by rn)
  into v_player_ids
  from ordered;

  with inserted as (
    insert into teams (tournament_id, name)
    select v_tournament_id, format('Equipe %s', lpad(gs::text, 2, '0'))
    from generate_series(1, 24) gs
    returning id, name
  ),
  ordered as (
    select id, row_number() over (order by name) as rn
    from inserted
  )
  select array_agg(id order by rn)
  into v_team_ids
  from ordered;

  for v_index in 1..24 loop
    insert into team_players (team_id, player_id)
    values (v_team_ids[v_index], v_player_ids[v_index * 2 - 1]);

    insert into team_players (team_id, player_id)
    values (v_team_ids[v_index], v_player_ids[v_index * 2]);
  end loop;

  insert into registrations (tournament_id, player_id, status)
  select v_tournament_id, unnest(v_player_ids), 'approved'
  on conflict (tournament_id, player_id) do nothing;
end $$;
