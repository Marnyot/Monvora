-- ============================================================
-- Migration 007: Explicit SELECT policy for Realtime subscriptions
-- Realtime respects RLS — user must have SELECT on their own rows
-- to receive realtime events. Existing 'transactions_all_own'
-- policy (FOR ALL) already covers this, but an explicit policy
-- ensures compatibility with Supabase Realtime 2026.
-- ============================================================

CREATE POLICY "realtime_transactions_select" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);
