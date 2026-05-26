-- ============================================================
-- Migration 006: Allow users to INSERT and UPDATE their own sync logs
-- Previously only SELECT was allowed (INSERT via service role only for Inngest).
-- Since we moved away from Inngest, users need to write their own logs.
-- ============================================================

CREATE POLICY "gmail_logs_insert_own" ON public.gmail_sync_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gmail_logs_update_own" ON public.gmail_sync_logs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
