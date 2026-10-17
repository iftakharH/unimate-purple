-- =============================================================================
-- Unimate · Phase 1 · Migration 7/7 — Seed data
-- Category list for the marketplace. Idempotent (safe to re-run).
-- Demo listings require a demo seller account and are added in Phase 4.
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
