-- Investor-demo seed data — already applied directly to the live project
-- (via the connected Supabase tooling, not the CLI). Kept here as a
-- reproducibility record, NOT wired into `supabase db reset` or any
-- migration runner — running this again would duplicate every row (no
-- idempotency guards; ids are generated fresh each run).
--
-- Additive only — never touches the project's real accounts. All demo
-- accounts use the @farmconnect.demo domain (non-resolvable, clearly
-- fictional) and the shared password Demo@1234 so any of them can be
-- logged into live during a walkthrough. Follows the project's
-- documented direct-auth.users convention (see ARCHITECTURE.md "Demo/
-- test account convention").
--
-- Seeds 3 demo farmers, 4 demo providers (one deliberately unverified
-- with zero reviews, one verified with zero reviews, so the app's
-- honest "New provider" empty state has real examples), and 9 jobs
-- spanning every farm_jobs.status value with matching offers,
-- assignments, reviews, and notifications.

do $$
declare
  v_farmer1 uuid := gen_random_uuid(); -- Anil Kumar, Palakkad
  v_farmer2 uuid := gen_random_uuid(); -- Suma Varghese, Thrissur
  v_farmer3 uuid := gen_random_uuid(); -- Rajesh Pillai, Kochi
  v_prov1_auth uuid := gen_random_uuid(); -- Ravi Menon / Kaveri Agro Services
  v_prov2_auth uuid := gen_random_uuid(); -- Beena Thomas / Malabar Harvest Co.
  v_prov3_auth uuid := gen_random_uuid(); -- Suresh Nair / Bharath Farm Equipment
  v_prov4_auth uuid := gen_random_uuid(); -- Arun Das / Green Fields Labour

  v_prov1_pp uuid;
  v_prov2_pp uuid;
  v_prov3_pp uuid;
  v_prov4_pp uuid;

  v_svc_land_clearing uuid;
  v_svc_ploughing uuid;
  v_svc_tilling uuid;
  v_svc_grass_cutting uuid;
  v_svc_spraying uuid;
  v_svc_harvesting uuid;
  v_svc_coconut uuid;
  v_svc_irrigation uuid;

  v_job_a1 uuid := gen_random_uuid();
  v_job_a2 uuid := gen_random_uuid();
  v_job_a3 uuid := gen_random_uuid();
  v_job_a4 uuid := gen_random_uuid();
  v_job_b1 uuid := gen_random_uuid();
  v_job_b2 uuid := gen_random_uuid();
  v_job_b3 uuid := gen_random_uuid();
  v_job_c1 uuid := gen_random_uuid();
  v_job_c2 uuid := gen_random_uuid();

  v_off_a1_p1 uuid := gen_random_uuid();
  v_off_a1_p4 uuid := gen_random_uuid();
  v_off_a2 uuid := gen_random_uuid();
  v_off_a3 uuid := gen_random_uuid();
  v_off_a4 uuid := gen_random_uuid();
  v_off_b2 uuid := gen_random_uuid();
  v_off_b3 uuid := gen_random_uuid();
  v_off_c1_p1 uuid := gen_random_uuid();
  v_off_c1_p3 uuid := gen_random_uuid();
  v_off_c2 uuid := gen_random_uuid();

  v_asn_a2 uuid := gen_random_uuid();
  v_asn_a3 uuid := gen_random_uuid();
  v_asn_a4 uuid := gen_random_uuid();
  v_asn_b2 uuid := gen_random_uuid();
  v_asn_b3 uuid := gen_random_uuid();
  v_asn_c2 uuid := gen_random_uuid();

  v_pw text := crypt('Demo@1234', gen_salt('bf'));

  v_palakkad extensions.geography := extensions.ST_SetSRID(extensions.ST_MakePoint(76.6548, 10.7867), 4326)::extensions.geography;
  v_thrissur extensions.geography := extensions.ST_SetSRID(extensions.ST_MakePoint(76.2144, 10.5276), 4326)::extensions.geography;
  v_kochi    extensions.geography := extensions.ST_SetSRID(extensions.ST_MakePoint(76.2673, 9.9312), 4326)::extensions.geography;
  v_malappuram extensions.geography := extensions.ST_SetSRID(extensions.ST_MakePoint(76.0711, 11.0510), 4326)::extensions.geography;
begin
  -- 1. auth.users — bypasses GoTrue's email flow per the documented
  -- convention; every token column that isn't nullable-safe is '' not
  -- NULL, or GoTrue 500s on the next token request.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values
    ('00000000-0000-0000-0000-000000000000', v_farmer1, 'authenticated', 'authenticated', 'anil.kumar@farmconnect.demo', v_pw, now(), now(), now() - interval '25 days', now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', '', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_farmer2, 'authenticated', 'authenticated', 'suma.varghese@farmconnect.demo', v_pw, now(), now(), now() - interval '20 days', now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', '', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_farmer3, 'authenticated', 'authenticated', 'rajesh.pillai@farmconnect.demo', v_pw, now(), now(), now() - interval '18 days', now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', '', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_prov1_auth, 'authenticated', 'authenticated', 'ravi.menon@farmconnect.demo', v_pw, now(), now(), now() - interval '45 days', now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', '', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_prov2_auth, 'authenticated', 'authenticated', 'beena.thomas@farmconnect.demo', v_pw, now(), now(), now() - interval '50 days', now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', '', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_prov3_auth, 'authenticated', 'authenticated', 'suresh.nair@farmconnect.demo', v_pw, now(), now(), now() - interval '30 days', now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', '', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_prov4_auth, 'authenticated', 'authenticated', 'arun.das@farmconnect.demo', v_pw, now(), now(), now() - interval '10 days', now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', '', '', '', '', '');

  -- 2. profiles — a bare row already exists per-user via
  -- on_auth_user_created; fill it in.
  update public.profiles set display_name = 'Anil Kumar', phone = '9812345601', location = 'Palakkad, Kerala', is_farmer = true, is_provider = false, onboarding_completed = true where id = v_farmer1;
  update public.profiles set display_name = 'Suma Varghese', phone = '9812345602', location = 'Thrissur, Kerala', is_farmer = true, is_provider = false, onboarding_completed = true where id = v_farmer2;
  update public.profiles set display_name = 'Rajesh Pillai', phone = '9812345603', location = 'Kochi, Kerala', is_farmer = true, is_provider = false, onboarding_completed = true where id = v_farmer3;
  update public.profiles set display_name = 'Ravi Menon', phone = '9812345611', location = 'Palakkad, Kerala', is_farmer = false, is_provider = true, onboarding_completed = true where id = v_prov1_auth;
  update public.profiles set display_name = 'Beena Thomas', phone = '9812345612', location = 'Thrissur, Kerala', is_farmer = false, is_provider = true, onboarding_completed = true where id = v_prov2_auth;
  update public.profiles set display_name = 'Suresh Nair', phone = '9812345613', location = 'Kochi, Kerala', is_farmer = false, is_provider = true, onboarding_completed = true where id = v_prov3_auth;
  update public.profiles set display_name = 'Arun Das', phone = '9812345614', location = 'Malappuram, Kerala', is_farmer = false, is_provider = true, onboarding_completed = true where id = v_prov4_auth;

  -- 3. provider_profiles
  insert into public.provider_profiles (profile_id, business_name, description, service_radius_km, location, verification_status, is_active, created_at)
    values (v_prov1_auth, 'Kaveri Agro Services', 'Land clearing, ploughing and crop-spraying for farms across Palakkad district. Own tractors and brush-cutting equipment.', 40, v_palakkad, 'verified', true, now() - interval '44 days')
    returning id into v_prov1_pp;
  insert into public.provider_profiles (profile_id, business_name, description, service_radius_km, location, verification_status, is_active, created_at)
    values (v_prov2_auth, 'Malabar Harvest Co.', 'Coconut and crop harvesting crews serving Thrissur and nearby taluks. Experienced tree climbers, fully insured.', 35, v_thrissur, 'verified', true, now() - interval '49 days')
    returning id into v_prov2_pp;
  insert into public.provider_profiles (profile_id, business_name, description, service_radius_km, location, verification_status, is_active, created_at)
    values (v_prov3_auth, 'Bharath Farm Equipment', 'Irrigation setup, grass cutting and spraying services around Kochi. Modern drip-irrigation equipment.', 30, v_kochi, 'verified', true, now() - interval '29 days')
    returning id into v_prov3_pp;
  insert into public.provider_profiles (profile_id, business_name, description, service_radius_km, location, verification_status, is_active, created_at)
    values (v_prov4_auth, 'Green Fields Labour', 'Local land-clearing and tilling crew, just getting started on FarmConnect after years of word-of-mouth work near Malappuram.', 25, v_malappuram, 'unverified', true, now() - interval '9 days')
    returning id into v_prov4_pp;

  -- 4. look up catalogue service ids
  select id into v_svc_land_clearing from public.services where name = 'Land Clearing';
  select id into v_svc_ploughing from public.services where name = 'Ploughing';
  select id into v_svc_tilling from public.services where name = 'Tilling';
  select id into v_svc_grass_cutting from public.services where name = 'Grass Cutting';
  select id into v_svc_spraying from public.services where name = 'Spraying';
  select id into v_svc_harvesting from public.services where name = 'Harvesting';
  select id into v_svc_coconut from public.services where name = 'Coconut Tree Climbing';
  select id into v_svc_irrigation from public.services where name = 'Irrigation Work';

  -- 5. provider_services
  insert into public.provider_services (provider_id, service_id, min_price, max_price, pricing_unit) values
    (v_prov1_pp, v_svc_land_clearing, 3500, 5000, 'acre'),
    (v_prov1_pp, v_svc_ploughing, 1500, 2200, 'acre'),
    (v_prov1_pp, v_svc_spraying, 2800, 3500, 'acre'),
    (v_prov2_pp, v_svc_harvesting, 2000, 3000, 'acre'),
    (v_prov2_pp, v_svc_coconut, 80, 120, 'tree'),
    (v_prov3_pp, v_svc_irrigation, 1200, 1800, 'hour'),
    (v_prov3_pp, v_svc_grass_cutting, 1000, 1500, 'acre'),
    (v_prov3_pp, v_svc_spraying, 2500, 3200, 'acre'),
    (v_prov4_pp, v_svc_land_clearing, 3000, 4200, 'acre'),
    (v_prov4_pp, v_svc_tilling, 1400, 2000, 'acre');

  -- 6. farm_jobs — inserted at an intermediate status where the job
  -- needs to reach in_progress/completed/cancelled, since those columns'
  -- side effects (completed_jobs_count) only fire on UPDATE, not INSERT.
  insert into public.farm_jobs (id, created_by, title, description, status, location, scheduled_start, scheduled_end, budget_min, budget_max, budget_type, created_at) values
    (v_job_a1, v_farmer1, 'Clear 2 acres for new planting before June sowing', 'South plot near the canal, mostly scrub and small trees. Needs clearing before we can start tilling.', 'offers_received', v_palakkad, now() + interval '10 days', now() + interval '12 days', 3500, 5000, 'fixed', now() - interval '4 days'),
    (v_job_a2, v_farmer1, 'Plough 3-acre paddy field before monsoon', 'Standard ploughing, field is accessible by tractor from the main road.', 'confirmed', v_palakkad, now() + interval '5 days', now() + interval '6 days', 1500, 2200, 'per_acre', now() - interval '6 days'),
    (v_job_a3, v_farmer1, 'Coconut harvest — 40 trees', 'Seasonal harvest, trees are mature and easy to access.', 'confirmed', v_palakkad, now() - interval '12 days', now() - interval '11 days', 3200, 4800, 'fixed', now() - interval '18 days'),
    (v_job_a4, v_farmer1, 'Clear overgrown boundary near canal', 'Boundary strip, roughly half an acre, overgrown for two seasons.', 'confirmed', v_palakkad, now() - interval '22 days', now() - interval '21 days', 1800, 2500, 'fixed', now() - interval '28 days'),
    (v_job_b1, v_farmer2, 'Grass cutting — 1.5 acres before cattle grazing', 'Open pasture, easy access from the road.', 'posted', v_thrissur, now() + interval '7 days', now() + interval '7 days', 1000, 1500, 'fixed', now() - interval '2 days'),
    (v_job_b2, v_farmer2, 'Irrigation setup for vegetable plot, 1 acre', 'Drip irrigation setup for a new vegetable plot behind the house.', 'confirmed', v_thrissur, now() - interval '3 days', now() + interval '1 day', 4000, 6000, 'fixed', now() - interval '9 days'),
    (v_job_b3, v_farmer2, 'Tilling before sowing — 2 acres', 'Field needs tilling before the next sowing cycle.', 'confirmed', v_thrissur, now() + interval '2 days', now() + interval '3 days', 2800, 4000, 'fixed', now() - interval '7 days'),
    (v_job_c1, v_farmer3, 'Pesticide spraying — 3 acres of banana plantation', 'Routine pest control, plantation is easy to access by road.', 'offers_received', v_kochi, now() + interval '4 days', now() + interval '4 days', 2800, 3500, 'fixed', now() - interval '3 days'),
    (v_job_c2, v_farmer3, 'Coconut harvest — 60 trees', 'Larger seasonal harvest across two adjoining plots.', 'confirmed', v_kochi, now() - interval '8 days', now() - interval '7 days', 4800, 6500, 'fixed', now() - interval '14 days');

  -- 7. job_services (what each job needs, shown on the job detail page)
  insert into public.job_services (job_id, service_id, quantity, unit) values
    (v_job_a1, v_svc_land_clearing, 2, 'acre'),
    (v_job_a2, v_svc_ploughing, 3, 'acre'),
    (v_job_a3, v_svc_coconut, 40, 'tree'),
    (v_job_a4, v_svc_land_clearing, 0.5, 'acre'),
    (v_job_b1, v_svc_grass_cutting, 1.5, 'acre'),
    (v_job_b2, v_svc_irrigation, 1, 'acre'),
    (v_job_b3, v_svc_tilling, 2, 'acre'),
    (v_job_c1, v_svc_spraying, 3, 'acre'),
    (v_job_c2, v_svc_coconut, 60, 'tree');

  -- 8. job_offers, all inserted 'pending' — accepting one flips it to
  -- 'accepted' automatically via job_assignments_sync_offer_status (0007).
  insert into public.job_offers (id, job_id, provider_id, price, message, estimated_start, estimated_duration, status, created_at) values
    (v_off_a1_p1, v_job_a1, v_prov1_pp, 4500, 'We can clear this in a day and a half with our brush-cutting crew. Debris hauled away at no extra cost.', now() + interval '10 days', interval '1 day 4 hours', 'pending', now() - interval '3 days'),
    (v_off_a1_p4, v_job_a1, v_prov4_pp, 3900, 'New to the platform but have done similar clearing work locally for years. Can start whenever suits you.', now() + interval '11 days', interval '2 days', 'pending', now() - interval '2 days'),
    (v_off_a2, v_job_a2, v_prov1_pp, 1900, 'Standard ploughing, tractor and implements included.', now() + interval '5 days', interval '6 hours', 'pending', now() - interval '5 days'),
    (v_off_a3, v_job_a3, v_prov2_pp, 3600, 'Two climbers, can finish all 40 trees in one day.', now() - interval '12 days', interval '8 hours', 'pending', now() - interval '17 days'),
    (v_off_a4, v_job_a4, v_prov1_pp, 2100, 'Clearing crew available, can start immediately.', now() - interval '22 days', interval '1 day', 'pending', now() - interval '27 days'),
    (v_off_b2, v_job_b2, v_prov3_pp, 5200, 'Drip irrigation setup, includes a materials survey before we start.', now() - interval '3 days', interval '2 days', 'pending', now() - interval '8 days'),
    (v_off_b3, v_job_b3, v_prov4_pp, 3200, 'Can till the full 2 acres in one visit.', now() + interval '2 days', interval '1 day', 'pending', now() - interval '6 days'),
    (v_off_c1_p1, v_job_c1, v_prov1_pp, 3200, 'We handle spraying alongside our land-prep work, own equipment.', now() + interval '4 days', interval '5 hours', 'pending', now() - interval '2 days'),
    (v_off_c1_p3, v_job_c1, v_prov3_pp, 2900, 'Certified for pesticide handling, can do the full plot in a morning.', now() + interval '4 days', interval '4 hours', 'pending', now() - interval '1 day'),
    (v_off_c2, v_job_c2, v_prov2_pp, 5400, 'Experienced with larger harvests, three-person crew.', now() - interval '8 days', interval '1 day 2 hours', 'pending', now() - interval '13 days');

  -- 9. job_assignments — the accepted offers. Trigger flips each
  -- referenced offer to 'accepted' automatically.
  insert into public.job_assignments (id, job_id, provider_id, offer_id, assigned_at, accepted_at) values
    (v_asn_a2, v_job_a2, v_prov1_pp, v_off_a2, now() - interval '5 days', now() - interval '5 days'),
    (v_asn_a3, v_job_a3, v_prov2_pp, v_off_a3, now() - interval '17 days', now() - interval '17 days'),
    (v_asn_a4, v_job_a4, v_prov1_pp, v_off_a4, now() - interval '27 days', now() - interval '27 days'),
    (v_asn_b2, v_job_b2, v_prov3_pp, v_off_b2, now() - interval '8 days', now() - interval '8 days'),
    (v_asn_b3, v_job_b3, v_prov4_pp, v_off_b3, now() - interval '6 days', now() - interval '6 days'),
    (v_asn_c2, v_job_c2, v_prov2_pp, v_off_c2, now() - interval '13 days', now() - interval '13 days');

  -- 10. lifecycle transitions via UPDATE (not part of the original
  -- INSERT) so farm_jobs_increment_completed_count actually fires.
  update public.farm_jobs set status = 'in_progress', started_at = now() - interval '2 days' where id = v_job_b2;

  update public.farm_jobs set status = 'in_progress', started_at = now() - interval '12 days' where id = v_job_a3;
  update public.farm_jobs set status = 'completed', completed_at = now() - interval '10 days' where id = v_job_a3;

  update public.farm_jobs set status = 'in_progress', started_at = now() - interval '22 days' where id = v_job_a4;
  update public.farm_jobs set status = 'completed', completed_at = now() - interval '20 days' where id = v_job_a4;

  update public.farm_jobs set status = 'in_progress', started_at = now() - interval '8 days' where id = v_job_c2;
  update public.farm_jobs set status = 'completed', completed_at = now() - interval '6 days' where id = v_job_c2;

  update public.farm_jobs
    set status = 'cancelled', cancelled_at = now() - interval '3 days', cancelled_by = v_farmer2, cancellation_reason = 'Plans changed'
    where id = v_job_b3;

  -- 11. reviews on the three completed jobs — trigger recomputes
  -- provider_profiles.rating_average/rating_count automatically.
  -- Providers 3 and 4 deliberately get zero reviews, so the app's
  -- honest "New provider · no ratings yet" state still has a real
  -- example to show, not just established providers.
  insert into public.reviews (job_id, assignment_id, reviewer_id, reviewee_id, rating, comment, created_at) values
    (v_job_a3, v_asn_a3, v_farmer1, v_prov2_auth, 5, 'Excellent work — finished all 40 trees in a day and cleaned up after themselves. Would book again.', now() - interval '10 days'),
    (v_job_a3, v_asn_a3, v_prov2_auth, v_farmer1, 5, 'Good site access and paid on time. Easy job to work with.', now() - interval '9 days'),
    (v_job_a4, v_asn_a4, v_farmer1, v_prov1_auth, 4, 'Solid work on the boundary clearing, took a little longer than quoted but the result was good.', now() - interval '19 days'),
    (v_job_c2, v_asn_c2, v_farmer3, v_prov2_auth, 4, 'Good work overall, crew arrived a bit later than planned but finished all 60 trees.', now() - interval '5 days');

  -- 12. notifications mirroring what each RPC would have generated.
  insert into public.notifications (recipient_id, type, title, body, related_entity_type, related_entity_id, read_at, created_at) values
    (v_farmer1, 'offer_received', 'New offer received', 'Kaveri Agro Services sent an offer on "Clear 2 acres for new planting before June sowing".', 'job', v_job_a1, now() - interval '3 days', now() - interval '3 days'),
    (v_farmer1, 'offer_received', 'New offer received', 'Green Fields Labour sent an offer on "Clear 2 acres for new planting before June sowing".', 'job', v_job_a1, null, now() - interval '2 days'),
    (v_farmer3, 'offer_received', 'New offer received', 'Kaveri Agro Services sent an offer on "Pesticide spraying — 3 acres of banana plantation".', 'job', v_job_c1, now() - interval '2 days', now() - interval '2 days'),
    (v_farmer3, 'offer_received', 'New offer received', 'Bharath Farm Equipment sent an offer on "Pesticide spraying — 3 acres of banana plantation".', 'job', v_job_c1, null, now() - interval '1 day'),
    (v_prov1_auth, 'offer_accepted', 'Your offer was accepted', 'You are confirmed for "Plough 3-acre paddy field before monsoon". The exact location and contact details are now available.', 'job', v_job_a2, now() - interval '5 days', now() - interval '5 days'),
    (v_prov2_auth, 'offer_accepted', 'Your offer was accepted', 'You are confirmed for "Coconut harvest — 40 trees". The exact location and contact details are now available.', 'job', v_job_a3, now() - interval '17 days', now() - interval '17 days'),
    (v_prov1_auth, 'offer_accepted', 'Your offer was accepted', 'You are confirmed for "Clear overgrown boundary near canal". The exact location and contact details are now available.', 'job', v_job_a4, now() - interval '27 days', now() - interval '27 days'),
    (v_prov3_auth, 'offer_accepted', 'Your offer was accepted', 'You are confirmed for "Irrigation setup for vegetable plot, 1 acre". The exact location and contact details are now available.', 'job', v_job_b2, now() - interval '8 days', now() - interval '8 days'),
    (v_prov4_auth, 'offer_accepted', 'Your offer was accepted', 'You are confirmed for "Tilling before sowing — 2 acres". The exact location and contact details are now available.', 'job', v_job_b3, now() - interval '6 days', now() - interval '6 days'),
    (v_prov2_auth, 'offer_accepted', 'Your offer was accepted', 'You are confirmed for "Coconut harvest — 60 trees". The exact location and contact details are now available.', 'job', v_job_c2, now() - interval '13 days', now() - interval '13 days'),
    (v_farmer2, 'job_started', 'Work has started', 'Bharath Farm Equipment started your job "Irrigation setup for vegetable plot, 1 acre".', 'job', v_job_b2, null, now() - interval '2 days'),
    (v_prov2_auth, 'job_completed', 'Job marked completed', 'The farmer marked "Coconut harvest — 40 trees" as completed.', 'job', v_job_a3, now() - interval '9 days', now() - interval '10 days'),
    (v_prov1_auth, 'job_completed', 'Job marked completed', 'The farmer marked "Clear overgrown boundary near canal" as completed.', 'job', v_job_a4, null, now() - interval '20 days'),
    (v_prov2_auth, 'job_completed', 'Job marked completed', 'The farmer marked "Coconut harvest — 60 trees" as completed.', 'job', v_job_c2, null, now() - interval '6 days'),
    (v_prov4_auth, 'job_cancelled', 'Job cancelled', 'Your job "Tilling before sowing — 2 acres" was cancelled. Reason: Plans changed', 'job', v_job_b3, null, now() - interval '3 days');
end $$;
