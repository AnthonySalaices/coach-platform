-- Demo data for local exploration. Idempotent (ON CONFLICT DO NOTHING).
-- Fixed UUIDs so foreign keys wire up without round-trips.

INSERT INTO users (id, name, email, role) VALUES
 ('11111111-1111-1111-1111-111111111111','Aria "Vex" Chen','vex@demo.gg','coach'),
 ('22222222-2222-2222-2222-222222222222','Marcus "Titan" Webb','titan@demo.gg','coach'),
 ('33333333-3333-3333-3333-333333333333','Sora Tanaka','sora@demo.gg','coach'),
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Jordan Pike','jordan@demo.gg','client'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','Riley Quinn','riley@demo.gg','client')
ON CONFLICT (id) DO NOTHING;

INSERT INTO coach_profiles (id, user_id, bio, games, default_currency) VALUES
 ('1c000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Radiant Valorant coach. Crosshair placement, mid-round calls, mentality.','["Valorant"]'::jsonb,'usd'),
 ('2c000000-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','Challenger mid-laner. Wave management and macro.','["League of Legends"]'::jsonb,'usd'),
 ('3c000000-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333','Apex Predator. Movement, rotations, third-party avoidance.','["Apex Legends"]'::jsonb,'usd')
ON CONFLICT (id) DO NOTHING;

INSERT INTO services (id, coach_id, title, description, duration_min, price, currency, active) VALUES
 ('51000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','VOD Review (Valorant)','Frame-by-frame review of one of your games.',45,4000,'usd',true),
 ('52000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Ranked Duo Coaching','Live duo queue with real-time callouts.',60,6000,'usd',true),
 ('53000000-0000-0000-0000-000000000003','22222222-2222-2222-2222-222222222222','Laning Phase Mastery','Last-hitting, trading, and wave states.',60,5500,'usd',true),
 ('54000000-0000-0000-0000-000000000004','22222222-2222-2222-2222-222222222222','Champion Pool Review','Build a coherent, meta champ pool.',45,4500,'usd',true),
 ('55000000-0000-0000-0000-000000000005','33333333-3333-3333-3333-333333333333','Movement & Positioning','Tap-strafe, zip rotations, edging.',50,5000,'usd',true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO bookings (id, client_id, coach_id, service_id, start_at, end_at, status) VALUES
 ('b1000000-0000-0000-0000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','51000000-0000-0000-0000-000000000001', now() + interval '2 days', now() + interval '2 days' + interval '45 min','confirmed'),
 ('b2000000-0000-0000-0000-000000000002','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','11111111-1111-1111-1111-111111111111','52000000-0000-0000-0000-000000000002', now() - interval '5 days', now() - interval '5 days' + interval '60 min','completed'),
 ('b3000000-0000-0000-0000-000000000003','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222','53000000-0000-0000-0000-000000000003', now() + interval '5 days', now() + interval '5 days' + interval '60 min','pending'),
 ('b4000000-0000-0000-0000-000000000004','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','33333333-3333-3333-3333-333333333333','55000000-0000-0000-0000-000000000005', now() - interval '1 day', now() - interval '1 day' + interval '50 min','cancelled'),
 ('b5000000-0000-0000-0000-000000000005','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222','54000000-0000-0000-0000-000000000004', now() + interval '7 days', now() + interval '7 days' + interval '45 min','confirmed')
ON CONFLICT (id) DO NOTHING;
