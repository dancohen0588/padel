do $$
declare
  v_tournament_id uuid;
  v_match record;
  v_sets int;
  v_match_winner_is_a boolean;
  v_loser_set_index int;
  v_set_index int;
  v_winner_is_a boolean;
  v_winner_games int;
  v_loser_games int;
  v_games_a int;
  v_games_b int;
  v_sets_won_a int;
  v_sets_won_b int;
  v_games_won_a int;
  v_games_won_b int;
  v_winner_team_id uuid;
begin
  select id
  into v_tournament_id
  from tournaments
  where name = 'Test 2'
  limit 1;

  if v_tournament_id is null then
    raise exception 'Tournoi "Test 2" introuvable';
  end if;

  for v_match in
    select id, team_a_id, team_b_id
    from matches
    where tournament_id = v_tournament_id
      and pool_id is not null
  loop
    delete from match_sets where match_id = v_match.id;

    v_sets := case when random() < 0.65 then 2 else 3 end;
    v_match_winner_is_a := random() < 0.5;
    v_loser_set_index := case when v_sets = 3 then floor(random() * 3)::int + 1 else 0 end;

    v_sets_won_a := 0;
    v_sets_won_b := 0;
    v_games_won_a := 0;
    v_games_won_b := 0;

    for v_set_index in 1..v_sets loop
      if v_sets = 2 then
        v_winner_is_a := v_match_winner_is_a;
      else
        v_winner_is_a := case
          when v_set_index = v_loser_set_index then not v_match_winner_is_a
          else v_match_winner_is_a
        end;
      end if;

      if random() < 0.2 then
        v_winner_games := 7;
        v_loser_games := case when random() < 0.5 then 5 else 6 end;
      else
        v_winner_games := 6;
        v_loser_games := floor(random() * 5)::int;
      end if;

      if v_winner_is_a then
        v_games_a := v_winner_games;
        v_games_b := v_loser_games;
        v_sets_won_a := v_sets_won_a + 1;
      else
        v_games_a := v_loser_games;
        v_games_b := v_winner_games;
        v_sets_won_b := v_sets_won_b + 1;
      end if;

      v_games_won_a := v_games_won_a + v_games_a;
      v_games_won_b := v_games_won_b + v_games_b;

      insert into match_sets (match_id, set_order, team_a_games, team_b_games)
      values (v_match.id, v_set_index, v_games_a, v_games_b);
    end loop;

    v_winner_team_id := case when v_match_winner_is_a then v_match.team_a_id else v_match.team_b_id end;

    update matches
    set
      status = 'finished',
      winner_team_id = v_winner_team_id,
      sets_won_a = v_sets_won_a,
      sets_won_b = v_sets_won_b,
      games_won_a = v_games_won_a,
      games_won_b = v_games_won_b
    where id = v_match.id;
  end loop;
end $$;
