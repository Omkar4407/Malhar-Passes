-- Attendee Google sign-in: optional phone until OTP links the account.
-- Run against your Supabase project (SQL editor or `supabase db push`).

ALTER TABLE public.users
  ALTER COLUMN phone_number DROP NOT NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS google_sub TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_key
  ON public.users (google_sub)
  WHERE google_sub IS NOT NULL;
