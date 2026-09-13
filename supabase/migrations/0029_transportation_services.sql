-- The Transportation category (seeded in 0004) has always had zero
-- services under it -- a real dead end in the job-posting wizard: a
-- farmer picking "Transportation" saw "No services in this category
-- yet." with no way to continue. Filling in the two obvious real
-- service types, matching the style/unit conventions of the rest of
-- the 0004 seed.
insert into public.services (category_id, name, description, unit_type)
select c.id, s.name, s.description, s.unit_type
from (values
  ('Transportation', 'Produce Transport', 'Transporting harvested produce from farm to market or storage', 'trip'),
  ('Transportation', 'Equipment Transport', 'Transporting machinery or heavy equipment to or from a farm', 'trip')
) as s(category_name, name, description, unit_type)
join public.service_categories c on c.name = s.category_name;
