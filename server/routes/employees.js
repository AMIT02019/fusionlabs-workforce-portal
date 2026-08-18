import { Router } from 'express'
import { db } from '../db.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = Router()

// GET /api/employees (List all employees with today's status)
router.get('/', authenticateToken, async (req, res) => {
  const today = req.query.date || new Date().toISOString().split('T')[0]

  const employees = await db.all(
    `SELECT u.id, u.name, u.email, u.role, u.created_at,
            a.check_in, a.check_out, a.working_minutes, a.status as today_status
     FROM users u
     LEFT JOIN attendance a ON u.id = a.user_id AND a.attendance_date = ?
     WHERE u.role != 'admin'
     ORDER BY u.name ASC`,
    [today]
  )

  res.json({ employees })
})

// GET /api/employees/:id (Admin get full employee detail)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const employee = await db.get(
    `SELECT id, name, email, role, created_at
     FROM users
     WHERE id = ?`,
    [req.params.id]
  )

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' })
  }

  const attendance = await db.all(
    `SELECT attendance_date, check_in, check_out, working_minutes, status
     FROM attendance
     WHERE user_id = ?
     ORDER BY attendance_date DESC`,
    [employee.id]
  )

  const tasks = await db.all(
    `SELECT *
     FROM tasks
     WHERE user_id = ?
     ORDER BY task_date DESC, start_time DESC`,
    [employee.id]
  )

  res.json({
    employee,
    attendance,
    tasks,
  })
})

// DELETE /api/employees/:id (Admin only: permanently delete an employee)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const employeeId = req.params.id

  const target = await db.get('SELECT id, name, role FROM users WHERE id = ?', [employeeId])
  if (!target) {
    return res.status(404).json({ error: 'Employee not found' })
  }

  if (target.role === 'admin') {
    return res.status(403).json({ error: 'Cannot delete an administrator account' })
  }

  // Delete records associated with this employee
  await db.run('DELETE FROM attendance WHERE user_id = ?', [employeeId])
  await db.run('DELETE FROM tasks WHERE user_id = ?', [employeeId])
  await db.run('DELETE FROM users WHERE id = ?', [employeeId])

  console.log(`🗑️ Employee removed by admin: ${target.name} (${employeeId})`)

  res.json({
    message: `Employee "${target.name}" has been permanently removed from the system.`,
  })
})

export default router
