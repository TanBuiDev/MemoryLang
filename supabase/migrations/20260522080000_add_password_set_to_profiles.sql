alter table public.profiles
  add column if not exists password_set boolean not null default false;
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, ui_language, password_set)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'vi',
    new.encrypted_password is not null
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;
