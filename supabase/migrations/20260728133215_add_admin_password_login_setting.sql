-- Admin accounts default to Google-only sign-in unless another admin explicitly enables passwords.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS allow_password_login boolean NOT NULL DEFAULT false;

-- Anonymous login UI needs a boolean answer without exposing profile data.
CREATE OR REPLACE FUNCTION public.can_login_with_password(check_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT coalesce(profile.is_admin = false OR profile.allow_password_login, true)
  FROM public.profiles AS profile
  WHERE lower(profile.email) = lower(btrim(check_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.can_login_with_password(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_login_with_password(text) TO anon, authenticated;

-- Keep the existing self-service profile fields, but never let a regular user
-- grant admin access or enable password sign-in for an admin account.
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_security_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    NEW.is_admin IS DISTINCT FROM OLD.is_admin
    OR NEW.allow_password_login IS DISTINCT FROM OLD.allow_password_login
  ) THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only an administrator can change administrator login settings.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_unauthorized_profile_security_changes() FROM PUBLIC;

DROP TRIGGER IF EXISTS protect_profile_security_fields ON public.profiles;
CREATE TRIGGER protect_profile_security_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unauthorized_profile_security_changes();

-- Correct the existing policies so the admin check is about the requester,
-- not the profile row being read or updated.
DROP POLICY IF EXISTS "admins select all profiles" ON public.profiles;
CREATE POLICY "admins select all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING ((select public.is_admin()) OR id = (select auth.uid()));

DROP POLICY IF EXISTS "admins update all profiles" ON public.profiles;
CREATE POLICY "admins update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((select public.is_admin()) OR id = (select auth.uid()))
  WITH CHECK ((select public.is_admin()) OR id = (select auth.uid()));
