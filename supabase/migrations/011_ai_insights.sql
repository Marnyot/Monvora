-- ============================================================
-- Migration 011: AI insights cache table
-- Daily Inngest job generates insights per user; UI reads from here.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL, -- 'YYYY-MM-DD' in WIB; one row per user per day
  insights JSONB NOT NULL,  -- string[] (max 3 lines, Bahasa Indonesia)
  model TEXT,               -- e.g. 'gemini-2.5-flash'
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_insights_user_day_unique UNIQUE (user_id, period_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_user_recent
  ON public.ai_insights (user_id, period_key DESC);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- Users can only read their own insights. Writes are service-role-only (Inngest job).
CREATE POLICY "Users view own AI insights"
  ON public.ai_insights
  FOR SELECT
  USING (auth.uid() = user_id);
