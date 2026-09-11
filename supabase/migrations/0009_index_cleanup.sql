-- Fix two real findings from the performance advisor after 0004-0007:
--
-- 1. machine_services.service_id and team_workers.worker_id are foreign
--    keys not covered by their table's composite primary key (which only
--    covers the leading column), so a lookup by the trailing column alone
--    (e.g. "which teams is this worker on") would scan the whole table.
-- 2. machine_availability_range_idx duplicated the index the EXCLUDE
--    constraint in 0006 already creates for itself
--    (machine_availability_machine_id_tstzrange_excl) — drop the
--    redundant one.

create index machine_services_service_id_idx on public.machine_services (service_id);
create index team_workers_worker_id_idx on public.team_workers (worker_id);

drop index public.machine_availability_range_idx;
