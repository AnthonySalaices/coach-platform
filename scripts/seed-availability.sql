-- Recurring weekly availability + one unavailability block for demo coaches.
-- Times are minutes-from-midnight UTC. Idempotent: clears prior demo rows first.
DELETE FROM availability WHERE coach_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

-- Vex: every day 14:00–22:00 UTC
INSERT INTO availability (id, coach_id, type, rule)
SELECT gen_random_uuid()::text, '11111111-1111-1111-1111-111111111111', 'recurring',
       jsonb_build_object('weekday', wd, 'startMinute', 840, 'endMinute', 1320)
FROM generate_series(0, 6) AS wd;

-- Titan: Tue + Thu 16:00–23:00 UTC
INSERT INTO availability (id, coach_id, type, rule)
SELECT gen_random_uuid()::text, '22222222-2222-2222-2222-222222222222', 'recurring',
       jsonb_build_object('weekday', wd, 'startMinute', 960, 'endMinute', 1380)
FROM (VALUES (2), (4)) AS t(wd);

-- Sora: Sat + Sun 18:00–22:00 UTC
INSERT INTO availability (id, coach_id, type, rule)
SELECT gen_random_uuid()::text, '33333333-3333-3333-3333-333333333333', 'recurring',
       jsonb_build_object('weekday', wd, 'startMinute', 1080, 'endMinute', 1320)
FROM (VALUES (0), (6)) AS t(wd);

-- Vex unavailable tomorrow 15:00–17:00 UTC (carves a hole out of an available day)
INSERT INTO availability (id, coach_id, type, rule, starts_at, ends_at)
VALUES (
  gen_random_uuid()::text,
  '11111111-1111-1111-1111-111111111111',
  'exception',
  '{}'::jsonb,
  (((now() AT TIME ZONE 'UTC')::date + 1) + time '15:00') AT TIME ZONE 'UTC',
  (((now() AT TIME ZONE 'UTC')::date + 1) + time '17:00') AT TIME ZONE 'UTC'
);
