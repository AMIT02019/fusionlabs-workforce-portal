import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { db } from '../db.js'
import { authenticateToken, requireAdmin, JWT_SECRET } from '../middleware/auth.js'

const router = Router()

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const user = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(email.trim())
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const valid = bcrypt.compareSync(password, user.password_hash)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

  const profile = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
  }

  res.json({
    token,
    user: profile,
  })
})

// POST /api/auth/register (Employee account creation)
router.post('/register', (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Full name, email, and password are required' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  const existing = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(email.trim())
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' })
  }

  const id = randomUUID()
  const password_hash = bcrypt.hashSync(password, 10)

  try {
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, 'employee', datetime('now'))
    `).run(id, name.trim(), email.trim().toLowerCase(), password_hash)

    const token = jwt.sign(
      { id, email: email.trim().toLowerCase(), role: 'employee' },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: 'employee',
      },
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to create account: ' + err.message })
  }
})

// GET /api/auth/me (Get current session user)
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user })
})

// POST /api/auth/change-password (User updates own password)
router.post('/change-password', authenticateToken, (req, res) => {
  const { newPassword } = req.body

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' })
  }

  const password_hash = bcrypt.hashSync(newPassword, 10)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, req.user.id)

  res.json({ message: 'Password updated successfully' })
})

// POST /api/auth/admin-reset-password (Admin resets an employee's password)
router.post('/admin-reset-password', authenticateToken, requireAdmin, (req, res) => {
  const { userId, newPassword } = req.body

  if (!userId || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'User ID and new password (min 6 chars) required' })
  }

  const target = db.prepare('SELECT id, role, name FROM users WHERE id = ?').get(userId)
  if (!target) {
    return res.status(404).json({ error: 'User not found' })
  }

  if (target.role === 'admin') {
    return res.status(403).json({ error: 'Cannot reset another administrator password' })
  }

  const password_hash = bcrypt.hashSync(newPassword, 10)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, userId)

  res.json({ message: `Password reset successfully for ${target.name}` })
})

export default router
