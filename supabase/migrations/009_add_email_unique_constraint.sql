-- Partial unique index to prevent duplicate transactions from the same Gmail email.
-- Partial: only enforced for non-deleted rows (deleted_at IS NULL) and emails
-- that actually came from Gmail (raw_email_id IS NOT NULL).
-- Manually entered transactions (raw_email_id IS NULL) are excluded.
-- Soft-deleted rows are excluded, so a row can be re-processed after deletion.
CREATE UNIQUE INDEX IF NOT EXISTS transactions_raw_email_id_user_unique
  ON public.transactions(user_id, raw_email_id)
  WHERE deleted_at IS NULL AND raw_email_id IS NOT NULL;
