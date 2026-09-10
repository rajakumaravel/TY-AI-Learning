-- Ensure the auth trigger function cannot be invoked through the exposed Data API.
-- Idempotent: repeats the revoke from the initial schema migration.
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
