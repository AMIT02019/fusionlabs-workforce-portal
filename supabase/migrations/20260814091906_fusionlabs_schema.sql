/*
# FusionLabs Digital - Employee Attendance System Schema

## Overview
Creates the data model for a simple employee attendance and daily task
management application. Authentication uses Supabase's built-in auth.users
table. A `profiles` table stores the display name and role (employee/admin)
for each user.

## New Tables
1. `profiles`
   - id (uuid, PK, references auth.users)
   - name (text, display name)
   - email (text, unique, mirrors auth email for convenience)
   - role (text, 'employee' or 'admin', defaults to 'employee')
   - created_at (timestamptz)

2. `attendance`
   - id (uuid, PK)
   - user_id (uuid, FK -> profiles, owner of the record)
   - attendance_date (date, the working day)
   - check_in (timestamptz, nullable, when employee checked in)
   - check_out (timestamptz, nullable, when employee checked out)
   - working_minutes (integer, nullable, computed on checkout)
   - status (text, 'PRESENT' | 'HALF DAY' | 'ABSENT', computed on checkout)
   - created_at (timestamptz)

3. `tasks`
   - id (uuid, PK)
   - user_id (uuid, FK -> profiles, owner of the task)
   - project_name (text)
   - task_name (text)
   - task_date (date, the day the task was started)
   - start_time (timestamptz, when the task was added)
   - end_time (timestamptz, nullable, set when task marked Completed)
   - duration_minutes (integer, nullable, computed on completion)
   - status (text, 'Not Done' | 'Half Done' | 'Completed', default 'Not Done')
   - created_at, updated_at (timestamptz)

## Security (RLS)
- profiles: any authenticated user can read all profiles (needed so employees
  can see the names attached to shared tasks, and admin can see employee names).
  Users can update only their own profile.
- attendance: employees can read/insert/update only their own rows. Admins
  (role = 'admin' in profiles) can read every employee's attendance.
- tasks: all authenticated users can read ALL tasks (shared visibility).
  Insert/update/delete is restricted to the task owner only.

## Automation
- A trigger auto-creates a `profiles` row (role = 'employee') whenever a new
  user registers through Supabase Auth, using the name supplied in signup
  metadata. This guarantees every new account is an employee; the admin account
  is created separately via a setup edge function that sets role = 'admin'.

## Notes
- working_minutes and status are written by the application on checkout using
  the rule: >=540 min PRESENT, >=240 min HALF DAY, else ABSENT.
- duration_minutes is written by the application when a task is marked
  Completed (end_time - start_time).
- Saturday and Sunday are treated as non-working days; the admin view does not
  render absent rows for weekends.
*/

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---------- attendance ----------
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  attendance_date date NOT NULL,
  check_in timestamptz,
  check_out timestamptz,
  working_minutes integer,
  status text CHECK (status IN ('PRESENT', 'HALF DAY', 'ABSENT')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, attendance_date)
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- employees: read own attendance; admin: read all
DROP POLICY IF EXISTS "attendance_select" ON attendance;
CREATE POLICY "attendance_select"
  ON attendance FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "attendance_insert_own" ON attendance;
CREATE POLICY "attendance_insert_own"
  ON attendance FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "attendance_update_own" ON attendance;
CREATE POLICY "attendance_update_own"
  ON attendance FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "attendance_delete_own" ON attendance;
CREATE POLICY "attendance_delete_own"
  ON attendance FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ---------- tasks ----------
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  project_name text NOT NULL,
  task_name text NOT NULL,
  task_date date NOT NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration_minutes integer,
  status text NOT NULL DEFAULT 'Not Done' CHECK (status IN ('Not Done', 'Half Done', 'Completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- all authenticated users can read ALL tasks (shared visibility)
DROP POLICY IF EXISTS "tasks_select_all" ON tasks;
CREATE POLICY "tasks_select_all"
  ON tasks FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "tasks_insert_own" ON tasks;
CREATE POLICY "tasks_insert_own"
  ON tasks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tasks_update_own" ON tasks;
CREATE POLICY "tasks_update_own"
  ON tasks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tasks_delete_own" ON tasks;
CREATE POLICY "tasks_delete_own"
  ON tasks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ---------- auto-create profile on signup ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- indexes ----------
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(task_date);
