import jwt from 'jsonwebtoken'
import { db } from '../db.js'

export const JWT_SECRET = process.env.JWT_SECRET || 'fusionlabs_super_secret_jwt_key_2026'

// Authenticate request token with serverless auto-healing
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' })
    }

    let user = null
    try {
      user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(decoded.id)
      
      // Auto-heal: If worker does not have this user in its local db, recreate user entry
      if (!user && decoded.id && decoded.email) {
        db.prepare(`
          INSERT OR IGNORE INTO users (id, name, email, password_hash, role, created_at)
          VALUES (?, ?, ?, '', ?, datetime('now'))
        `).run(
          decoded.id,
          decoded.name || decoded.email.split('@')[0],
          decoded.email.toLowerCase(),
          decoded.role || 'employee'
        )
        user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(decoded.id)
      }
    } catch (dbErr) {
      console.warn('Database lookup warning:', dbErr)
    }

    if (!user) {
      user = {
        id: decoded.id,
        name: decoded.name || decoded.email?.split('@')[0] || 'User',
        email: decoded.email,
        role: decoded.role || 'employee',
        created_at: new Date().toISOString(),
      }
    }

    req.user = user
    next()
  })
}

// Require Admin role
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Access forbidden: Administrators only' })
  }
  next()
}
