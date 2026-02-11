-- Diagnostic SQL: configuration + rounds + matches pour Test 2/3/4

select
  t.name,
  t.id,
  t.config->'playoffs' as playoffs_config,
  (t.config->'playoffs'->>'teams_qualified')::int as teams_qualified
from tournaments t
where t.name in ('Test 2', 'Test 3', 'Test 4')
order by t.name;

-- Rounds générés (nombre + libellé)
select
  t.name,
  pr.round_number,
  pr.round_name,
  count(pm.id) as match_count
from tournaments t
join playoff_rounds pr on pr.tournament_id = t.id
join playoff_matches pm on pm.round_id = pr.id
where t.name in ('Test 2', 'Test 3', 'Test 4')
group by t.name, pr.round_number, pr.round_name
order by t.name, pr.round_number;

-- Seeds de premier tour (pour voir si 8 équipes devraient donner 4 matchs)
select
  t.name,
  pm.match_number,
  pm.team1_seed,
  pm.team2_seed,
  pm.team1_id,
  pm.team2_id
from tournaments t
join playoff_matches pm on pm.tournament_id = t.id
where t.name in ('Test 2', 'Test 3', 'Test 4')
  and pm.team1_seed is not null
order by t.name, pm.match_number;

-- Vérifier si le bracket a été généré avec un mauvais total_qualified historique
-- (si teams_qualified=8 mais rounds commencent en 16èmes -> incohérence)
select
  t.name,
  (t.config->'playoffs'->>'teams_qualified')::int as teams_qualified,
  min(pr.round_number) as first_round_number,
  min(pr.round_name) as first_round_name
from tournaments t
join playoff_rounds pr on pr.tournament_id = t.id
where t.name in ('Test 2', 'Test 3', 'Test 4')
group by t.name, teams_qualified
order by t.name;

