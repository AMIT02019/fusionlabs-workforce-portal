/*
# Allow admin to edit and delete any employee's task

## Context
The employee task system restricts UPDATE/DELETE to the row owner. The admin
upgrade requires the admin ("Sir") to edit or delete ANY employee's task.

## Changes
- tasks UPDATE policy: allow the owner OR any user whose profile role = 'admin'.
- tasks DELETE policy: allow the owner OR any user whose profile role = 'admin'.
- SELECT stays open to all authenticated users (shared visibility unchanged).
- INSERT stays owner-only (admin does not create tasks on behalf of employees).
*/

DROP POLICY IF EXISTS "tasks_update_own" ON tasks;
CREATE POLICY "tasks_update_own_or_admin"
  ON tasks FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "tasks_delete_own" ON tasks;
CREATE POLICY "tasks_delete_own_or_admin"
  ON tasks FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
