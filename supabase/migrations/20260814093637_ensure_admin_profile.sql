/*
# Ensure admin profile exists

The setup-admin edge function creates the admin auth user + profile when the
Home page is first visited. If the edge function hasn't run yet (e.g. the
browser hasn't loaded the Home page), this migration seeds the profile row
for any admin user that already exists in auth.users but lacks a profile.
It also safely handles the case where the admin user doesn't exist yet —
the edge function will create it on next Home page visit.

This is idempotent: it only inserts if a matching profile doesn't exist.
*/

INSERT INTO profiles (id, name, email, role)
SELECT id, 'Administrator', email, 'admin'
FROM auth.users
WHERE email = 'admin@fusionlabs.com'
  AND NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.users.id
  );
