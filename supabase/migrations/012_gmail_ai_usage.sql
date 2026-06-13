-- ============================================================
-- Migration 012: Daily Gmail AI parser usage tracking
-- Backend-only quota counter. Never exposed to client / UI — the
-- frontend stays unaware that any email was parsed by AI.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gmail_ai_usage_daily (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,           -- WIB calendar date
  call_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_gmail_ai_usage_user_date
  ON public.gmail_ai_usage_daily (user_id, usage_date DESC);

ALTER TABLE public.gmail_ai_usage_daily ENABLE ROW LEVEL SECURITY;

-- No client-side SELECT/INSERT/UPDATE policies: only service-role (sync job)
-- writes to this table. Exposing it to the user would reveal that AI is in
-- the loop, which is intentionally hidden.
