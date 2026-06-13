-- Feedback dari user ke developer Monvora.
-- Insert-only oleh user (own row), select sendiri saja, no update/delete.
-- Developer baca via service-role (Supabase dashboard).

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('bug', 'feature', 'praise', 'other')),
  body text not null check (char_length(body) between 5 and 2000),
  app_version text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_user_created
  on public.feedback(user_id, created_at desc);

alter table public.feedback enable row level security;

create policy "feedback_insert_own" on public.feedback
  for insert with check (auth.uid() = user_id);

create policy "feedback_select_own" on public.feedback
  for select using (auth.uid() = user_id);
