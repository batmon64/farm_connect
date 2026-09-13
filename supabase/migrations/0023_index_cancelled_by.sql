-- Performance advisor flagged farm_jobs.cancelled_by (added in 0022) as
-- an unindexed foreign key. Not on any current hot path, but cheap and
-- correct to add now rather than carry a known advisor finding forward.
create index farm_jobs_cancelled_by_idx on public.farm_jobs (cancelled_by);
