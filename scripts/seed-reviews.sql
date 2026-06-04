-- More completed bookings + reviews so coaches have ratings, leaving one
-- completed booking (b8, Jordan→Sora) unreviewed to demo the review form.
INSERT INTO bookings (id, client_id, coach_id, service_id, start_at, end_at, status) VALUES
 ('b6000000-0000-0000-0000-000000000006','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','51000000-0000-0000-0000-000000000001', now() - interval '8 days', now() - interval '8 days' + interval '45 min','completed'),
 ('b7000000-0000-0000-0000-000000000007','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','22222222-2222-2222-2222-222222222222','53000000-0000-0000-0000-000000000003', now() - interval '10 days', now() - interval '10 days' + interval '60 min','completed'),
 ('b8000000-0000-0000-0000-000000000008','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','33333333-3333-3333-3333-333333333333','55000000-0000-0000-0000-000000000005', now() - interval '3 days', now() - interval '3 days' + interval '50 min','completed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (id, booking_id, client_id, coach_id, rating, comment) VALUES
 ('d0000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000002','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','11111111-1111-1111-1111-111111111111',5,'Cracked aim advice — climbed two ranks in a week.'),
 ('d0000000-0000-0000-0000-000000000002','b6000000-0000-0000-0000-000000000006','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111',5,'Best VOD review I have had. Worth every cent.'),
 ('d0000000-0000-0000-0000-000000000003','b7000000-0000-0000-0000-000000000007','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','22222222-2222-2222-2222-222222222222',4,'Solid macro tips, wish the session was longer.')
ON CONFLICT (id) DO NOTHING;
