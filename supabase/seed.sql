-- =============================================================================
-- Unimate · Seed data
-- Run after migrations on a fresh database (`supabase db reset` runs this
-- automatically; on the hosted project the same rows are applied by migration
-- 20261018100007). Idempotent.
-- =============================================================================

insert into public.categories (name, slug, icon, sort_order) values
  ('Books & Notes',        'books-notes',        'BookOpen',       1),
  ('Electronics',          'electronics',        'Smartphone',     2),
  ('Laptops & Accessories','laptops-accessories','Laptop',         3),
  ('Stationery',           'stationery',         'PenLine',        4),
  ('Dorm & Furniture',     'dorm-furniture',     'BedDouble',      5),
  ('Clothing',             'clothing',           'Shirt',          6),
  ('Sports & Fitness',     'sports-fitness',     'Dumbbell',       7),
  ('Food & Snacks',        'food-snacks',        'UtensilsCrossed',8),
  ('Services & Tutoring',  'services-tutoring',  'GraduationCap',  9),
  ('Tickets & Events',     'tickets-events',     'Ticket',        10),
  ('Others',               'others',             'Package',       11)
on conflict (slug) do nothing;

-- Demo seller + sample listings are created in Phase 4, once the listing
-- creation UI exists and a demo account can be provisioned through the
-- admin flows. See docs/PROGRESS.md.
