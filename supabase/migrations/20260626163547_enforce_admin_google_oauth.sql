CREATE OR REPLACE FUNCTION public.is_admin_email(check_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE email = check_email AND is_admin = true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_email(text) TO anon, authenticated;;
