-- Gmail Push Notification support
-- watch_expiration: kapan watch() akan expired (7 hari), perlu renew sebelum itu
-- watch_history_id: historyId dari response watch(), untuk renewal
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gmail_watch_expiration TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gmail_watch_history_id TEXT;
