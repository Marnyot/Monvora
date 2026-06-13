-- ============================================================
-- GUEST AUTH (Supabase anonymous sign-in support)
-- ============================================================
-- Anonymous users have no email at the auth.users level. The current
-- handle_new_user() trigger inserts NEW.email into profiles.email which
-- is NOT NULL, causing the trigger to fail and the signInAnonymously()
-- call to error out. This migration:
--   1. Makes profiles.email nullable so anonymous profiles can be created.
--   2. Adds profiles.is_guest mirroring auth.users.is_anonymous, so the
--      app can distinguish guest sessions and surface the "Daftar untuk
--      simpan" prompt without re-reading the JWT on every page.
--   3. Replaces handle_new_user() to carry the is_anonymous flag through
--      to is_guest at profile creation time.
-- ============================================================

ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, is_guest)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.is_anonymous, FALSE)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
