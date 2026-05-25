-- ============================================================
-- DEFAULT SYSTEM CATEGORIES
-- user_id IS NULL = system category (readable by all users via RLS)
-- ============================================================

-- EXPENSE categories
INSERT INTO public.categories (name, icon, color, type, is_system) VALUES
  ('Makan & Minum',    'UtensilsCrossed', '#f97316', 'expense', TRUE),
  ('Transportasi',     'Car',             '#3b82f6', 'expense', TRUE),
  ('Belanja',          'ShoppingBag',     '#8b5cf6', 'expense', TRUE),
  ('Hiburan',          'Gamepad2',        '#ec4899', 'expense', TRUE),
  ('Kesehatan',        'HeartPulse',      '#ef4444', 'expense', TRUE),
  ('Tagihan',          'FileText',        '#64748b', 'expense', TRUE),
  ('Pendidikan',       'BookOpen',        '#0ea5e9', 'expense', TRUE),
  ('Perawatan Diri',   'Sparkles',        '#a855f7', 'expense', TRUE),
  ('Rumah',            'Home',            '#84cc16', 'expense', TRUE),
  ('Investasi',        'TrendingUp',      '#10b981', 'expense', TRUE),
  ('Donasi',           'Heart',           '#f43f5e', 'expense', TRUE),
  ('Lainnya',          'MoreHorizontal',  '#94a3b8', 'expense', TRUE);

-- INCOME categories
INSERT INTO public.categories (name, icon, color, type, is_system) VALUES
  ('Gaji',             'Banknote',        '#22c55e', 'income', TRUE),
  ('Freelance',        'Laptop',          '#10b981', 'income', TRUE),
  ('Bisnis',           'Briefcase',       '#0ea5e9', 'income', TRUE),
  ('Investasi',        'TrendingUp',      '#6366f1', 'income', TRUE),
  ('Hadiah',           'Gift',            '#f59e0b', 'income', TRUE),
  ('Pengembalian',     'RotateCcw',       '#64748b', 'income', TRUE),
  ('Lainnya',          'MoreHorizontal',  '#94a3b8', 'income', TRUE);

-- TRANSFER category
INSERT INTO public.categories (name, icon, color, type, is_system) VALUES
  ('Transfer',         'ArrowLeftRight',  '#6366f1', 'transfer', TRUE);
