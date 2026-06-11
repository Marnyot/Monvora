-- ============================================================
-- Migration 010: Add 'topup' to payment_method CHECK constraint
-- Mandiri "Top Up Berhasil" emails di-parse sebagai payment_method 'topup'.
-- Tanpa ini, insert transaksi top-up akan ditolak constraint.
-- ============================================================

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_payment_method_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_payment_method_check
  CHECK (payment_method IN ('qris', 'transfer', 'cash', 'debit', 'credit', 'ewallet', 'topup', 'other'));
