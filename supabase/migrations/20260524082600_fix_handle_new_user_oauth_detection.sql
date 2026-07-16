CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  is_oauth boolean;
BEGIN
  is_oauth := new.raw_user_meta_data->>'iss' IS NOT NULL;

  INSERT INTO public.profiles (id, display_name, ui_language, password_set)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'vi',
    NOT is_oauth
  );
  RETURN new;
END;
$$;;
