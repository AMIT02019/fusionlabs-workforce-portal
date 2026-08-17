import { Router } from 'express'
import { randomUUID } from 'crypto'
import { db } from '../db.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = Router()

// Helper: Calculate attendance status
function calculateStatus(workingMinutes) {
  const m = Number(workingMinutes)
  if (m >= 540) return 'PRESENT'
  if (m >= 240) return 'HALF DAY'
  return 'ABSENT'
}

// GET /api/attendance/today (Logged in user's attendance today)
router.get('/today', authenticateToken, (req, res) => {
  const dateStr = req.query.date || new Date().toISOString().split('T')[0]
  const record = db.prepare(`
    SELECT * FROM attendance 
    WHERE user_id = ? AND attendance_date = ?
  `).get(req.user.id, dateStr)

  res.json({ attendance: record || null })
})

// POST /api/attendance/check-in
router.post('/check-in', authenticateToken, (req, res) => {
  const today = req.body.date || new Date().toISOString().split('T')[0]
  const now = new Date().toISOString()

  const existing = db.prepare(`
    SELECT * FROM attendance WHERE user_id = ? AND attendance_date = ?
  `).get(req.user.id, today)

  if (existing && existing.check_in) {
    return res.status(400).json({ error: 'Already checked in today' })
  }

  const id = existing?.id || randomUUID()

  if (existing) {
    db.prepare(`
      UPDATE attendance SET check_in = ? WHERE id = ?
    `).run(now, id)
  } else {
    db.prepare(`
      INSERT INTO attendance (id, user_id, attendance_date, check_in, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(id, req.user.id, today, now)
  }

  const record = db.prepare('SELECT * FROM attendance WHERE id = ?').get(id)
  res.json({ message: 'Checked in successfully', attendance: record })
})

// POST /api/attendance/check-out
router.post('/check-out', authenticateToken, (req, res) => {
  const today = req.body.date || new Date().toISOString().split('T')[0]
  const now = new Date()
  const nowStr = now.toISOString()

  const existing = db.prepare(`
    SELECT * FROM attendance WHERE user_id = ? AND attendance_date = ?
  `).get(req.user.id, today)

  if (!existing || !existing.check_in) {
    return res.status(400).json({ error: 'No check-in record found for today' })
  }

  if (existing.check_out) {
    return res.status(400).json({ error: 'Already checked out today' })
  }

  const checkInTime = new Date(existing.check_in).getTime()
  const checkOutTime = now.getTime()
  const diffMinutes = Math.max(0, Math.round((checkOutTime - checkInTime) / 60000))
  const status = calculateStatus(diffMinutes)

  db.prepare(`
    UPDATE attendance 
    SET check_out = ?, working_minutes = ?, status = ?
    WHERE id = ?
  `).run(nowStr, diffMinutes, status, existing.id)

  const record = db.prepare('SELECT * FROM attendance WHERE id = ?').get(existing.id)
  res.json({ message: 'Checked out successfully', attendance: record })
})

// GET /api/attendance/history (Last 30 attendance records for current user)
router.get('/history', authenticateToken, (req, res) => {
  const records = db.prepare(`
    SELECT attendance_date, check_in, check_out, working_minutes, status 
    FROM attendance 
    WHERE user_id = ? 
    ORDER BY attendance_date DESC 
    LIMIT 30
  `).all(req.user.id)

  res.json({ records })
})

// GET /api/attendance/admin/date/:date (Admin: all employee attendance for a specific date)
router.get('/admin/date/:date', authenticateToken, requireAdmin, (req, res) => {
  const dateStr = req.params.date
  const records = db.prepare(`
    SELECT a.*, u.name, u.email
    FROM users u
    LEFT JOIN attendance a ON u.id = a.user_id AND a.attendance_date = ?
    WHERE u.role != 'admin'
    ORDER BY u.name ASC
  `).all(dateStr)

  res.json({ records })
})

// GET /api/attendance/admin/calendar (Admin: monthly calendar query)
router.get('/admin/calendar', authenticateToken, requireAdmin, (req, res) => {
  const { startDate, endDate, userId } = req.query

  let query = `
    SELECT a.*, u.name
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    WHERE a.attendance_date >= ? AND a.attendance_date <= ?
  `
  const params = [startDate, endDate]

  if (userId && userId !== 'all') {
    query += ` AND a.user_id = ?`
    params.push(userId)
  }

  const records = db.prepare(query).all(...params)
  res.json({ records })
})

export default router
