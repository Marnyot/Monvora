-- ============================================================
-- Migration 013: Atomic per-user daily AI budget reservation
-- Replaces the read-then-upsert pattern in ai-fallback.ts which
-- was racy under parallel email processing.
-- Returns the new call_count after a successful reservation,
-- or NULL if the daily cap has already been hit.
-- ============================================================

CREATE OR REPLACE FUNCTION public.gmail_ai_reserve_call(
  p_user_id UUID,
  p_usage_date DATE,
  p_max_count INT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count INT;
BEGIN
  INSERT INTO public.gmail_ai_usage_daily AS u (user_id, usage_date, call_count, updated_at)
  VALUES (p_user_id, p_usage_date, 1, NOW())
  ON CONFLICT (user_id, usage_date)
  DO UPDATE
    SET call_count = u.call_count + 1,
        updated_at = NOW()
    WHERE u.call_count < p_max_count
  RETURNING call_count INTO v_new_count;

  -- v_new_count is NULL when the WHERE filter blocked the update
  -- (cap already hit). Caller treats NULL as "budget exhausted".
  RETURN v_new_count;
END;
$$;

-- Only the service role (sync job) ever invokes this. Revoke from
-- anon/authenticated so the function is not callable from the client.
REVOKE ALL ON FUNCTION public.gmail_ai_reserve_call(UUID, DATE, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gmail_ai_reserve_call(UUID, DATE, INT) FROM anon, authenticated;
