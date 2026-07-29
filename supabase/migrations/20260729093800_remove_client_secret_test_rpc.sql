-- Raw provider secrets must never be returned through the Data API.
revoke all on function public.get_key_pool_secret_for_test(uuid)
from public, anon, authenticated, service_role;

drop function if exists public.get_key_pool_secret_for_test(uuid);
