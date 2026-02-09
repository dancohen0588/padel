-- Convert tournament config stored as a JSON string into a JSONB object
-- Only touch rows where config is a JSON string ("{...}")
update public.tournaments
set config = (config::text)::jsonb
where jsonb_typeof(config) = 'string';
