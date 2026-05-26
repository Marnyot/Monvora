-- Performance indexes untuk query dashboard dan wallet
-- Tambah index untuk wallets yang sering di-query dengan filter user_id + is_active
CREATE INDEX IF NOT EXISTS idx_wallets_user_active
  ON public.wallets(user_id, is_active)
  WHERE deleted_at IS NULL;

-- Composite index untuk monthly aggregation query (pengeluaran/pemasukan bulan ini)
CREATE INDEX IF NOT EXISTS idx_transactions_monthly
  ON public.transactions(user_id, transacted_at DESC)
  WHERE deleted_at IS NULL;
