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

  const cleanEmail = email.trim().toLowerCase()
  const user = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(cleanEmail)
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const valid = bcrypt.compareSync(password, user.password_hash)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
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

  const cleanEmail = email.trim().toLowerCase()
  const cleanName = name.trim()

  const existing = db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(cleanEmail)
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' })
  }

  const id = randomUUID()
  const password_hash = bcrypt.hashSync(password, 10)

  try {
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, 'employee', datetime('now'))
    `).run(id, cleanName, cleanEmail, password_hash)

    const token = jwt.sign(
      { id, name: cleanName, email: cleanEmail, role: 'employee' },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: 'Account created successfully. Please sign in with your credentials.',
      token,
      user: {
        id,
        name: cleanName,
        email: cleanEmail,
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

// POST /api/auth/admin-profile (Admin updates own ID / email, name, and/or password)
router.post('/admin-profile', authenticateToken, requireAdmin, (req, res) => {
  const { name, email, newPassword } = req.body

  const adminId = req.user.id
  const currentAdmin = db.prepare('SELECT * FROM users WHERE id = ?').get(adminId)
  if (!currentAdmin) {
    return res.status(404).json({ error: 'Admin account not found' })
  }

  let finalName = name?.trim() || currentAdmin.name
  let finalEmail = email?.trim().toLowerCase() || currentAdmin.email
  let finalPasswordHash = currentAdmin.password_hash

  // Check email uniqueness if email is changed
  if (finalEmail !== currentAdmin.email.toLowerCase()) {
    const existing = db.prepare('SELECT id FROM users WHERE lower(email) = ? AND id != ?').get(finalEmail, adminId)
    if (existing) {
      return res.status(409).json({ error: 'This email address is already in use by another account' })
    }
  }

  // Update password if provided
  if (newPassword) {
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' })
    }
    finalPasswordHash = bcrypt.hashSync(newPassword, 10)
  }

  try {
    db.prepare(`
      UPDATE users 
      SET name = ?, email = ?, password_hash = ?
      WHERE id = ?
    `).run(finalName, finalEmail, finalPasswordHash, adminId)

    const updatedUser = {
      id: adminId,
      name: finalName,
      email: finalEmail,
      role: 'admin',
      created_at: currentAdmin.created_at,
    }

    const token = jwt.sign(
      { id: adminId, name: finalName, email: finalEmail, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    console.log(`🛡️ Admin profile updated: Name: "${finalName}", Email: "${finalEmail}"`)

    res.json({
      message: 'Admin credentials updated successfully.',
      token,
      user: updatedUser,
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update admin profile: ' + err.message })
  }
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
