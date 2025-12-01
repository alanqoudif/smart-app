-- Seed menu items (idempotent upsert by name/category).
insert into public.menu_items (name, category, price, prep_time_minutes, is_available)
values
  ('سمّاش برجر', 'Burgers', 3.80, 12, true),
  ('ترافل مشروم برجر', 'Burgers', 4.60, 15, true),
  ('كريسبي تشيكن ساندويتش', 'Sandwiches', 3.20, 11, true),
  ('بطاطس لودد', 'Sides', 1.80, 8, true),
  ('سلطة سيزر', 'Salads', 2.60, 9, true),
  ('سبانيش لاتيه بارد', 'Beverages', 1.90, 4, true)
on conflict (name, category) do update
set price = excluded.price,
    prep_time_minutes = excluded.prep_time_minutes,
    is_available = excluded.is_available;
