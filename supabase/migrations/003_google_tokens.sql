-- Google OAuth token storage di profiles
-- provider_token dari Supabase session hilang saat session di-refresh oleh middleware.
-- Solusi: simpan di DB, refresh via Google OAuth2 endpoint jika kadaluarsa.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS google_access_token TEXT,
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMPTZ;
