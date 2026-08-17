import { Router } from 'express'
import { db } from '../db.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = Router()

// GET /api/employees (Admin list all employees with today's status)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  const today = req.query.date || new Date().toISOString().split('T')[0]

  const employees = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.created_at,
           a.check_in, a.check_out, a.working_minutes, a.status as today_status
    FROM users u
    LEFT JOIN attendance a ON u.id = a.user_id AND a.attendance_date = ?
    WHERE u.role != 'admin'
    ORDER BY u.name ASC
  `).all(today)

  res.json({ employees })
})

// GET /api/employees/:id (Admin get full employee detail)
router.get('/:id', authenticateToken, requireAdmin, (req, res) => {
  const employee = db.prepare(`
    SELECT id, name, email, role, created_at
    FROM users
    WHERE id = ?
  `).get(req.params.id)

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' })
  }

  const attendance = db.prepare(`
    SELECT attendance_date, check_in, check_out, working_minutes, status
    FROM attendance
    WHERE user_id = ?
    ORDER BY attendance_date DESC
  `).all(employee.id)

  const tasks = db.prepare(`
    SELECT *
    FROM tasks
    WHERE user_id = ?
    ORDER BY task_date DESC, start_time DESC
  `).all(employee.id)

  res.json({
    employee,
    attendance,
    tasks,
  })
})

// DELETE /api/employees/:id (Admin only: permanently delete an employee)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const employeeId = req.params.id

  const target = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(employeeId)
  if (!target) {
    return res.status(404).json({ error: 'Employee not found' })
  }

  if (target.role === 'admin') {
    return res.status(403).json({ error: 'Cannot delete an administrator account' })
  }

  // Delete records associated with this employee
  db.prepare('DELETE FROM attendance WHERE user_id = ?').run(employeeId)
  db.prepare('DELETE FROM tasks WHERE user_id = ?').run(employeeId)
  db.prepare('DELETE FROM users WHERE id = ?').run(employeeId)

  console.log(`🗑️ Employee removed by admin: ${target.name} (${employeeId})`)

  res.json({
    message: `Employee "${target.name}" has been permanently removed from the system.`,
  })
})

export default router
