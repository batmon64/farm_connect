-- Performance advisor flagged reviews.reviewer_id as an unindexed
-- foreign key. Also genuinely useful: "has the current user already
-- reviewed this assignment" is looked up by (assignment_id, reviewer_id)
-- from the client (RLS already scopes it to their own rows).
create index reviews_reviewer_id_idx on public.reviews (reviewer_id);
