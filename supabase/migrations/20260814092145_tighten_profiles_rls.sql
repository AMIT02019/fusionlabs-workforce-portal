/*
# Tighten profiles RLS

The on_auth_user_created trigger (SECURITY DEFINER) creates each profile on
signup, so clients never need to INSERT into profiles themselves. Removing
client INSERT prevents a malicious client from crafting a profile row with
role = 'admin'. Admin profiles are created/upserted only by the setup-admin
edge function using the service role key, which bypasses RLS.

## Changes
- Drop and do not re-create any INSERT policy on profiles. The anon/authenticated
  roles retain their table-level INSERT grant, but with no INSERT policy,
  RLS denies all client inserts.
- Keep SELECT (all authenticated) and UPDATE (own row) policies as-is.
*/

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
-- intentionally no replacement: inserts handled by SECURITY DEFINER trigger

-- Add a guard so even an update cannot escalate role to admin
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = 'employee');
