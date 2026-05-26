-- Add to_wallet_id for inter-wallet transfers
ALTER TABLE public.transactions
  ADD COLUMN to_wallet_id UUID REFERENCES public.wallets(id);

CREATE INDEX idx_transactions_to_wallet
  ON public.transactions(to_wallet_id)
  WHERE to_wallet_id IS NOT NULL;
