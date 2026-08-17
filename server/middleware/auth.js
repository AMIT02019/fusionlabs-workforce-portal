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

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' })
    }

    let user = null
    try {
      user = await db.get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [decoded.id])

      // Auto-heal: If worker/db is missing user record, recreate it
      if (!user && decoded.id && decoded.email) {
        await db.run(
          `INSERT INTO users (id, name, email, password_hash, role)
           VALUES (?, ?, ?, '', ?)
           ON CONFLICT (id) DO NOTHING`,
          [
            decoded.id,
            decoded.name || decoded.email.split('@')[0],
            decoded.email.toLowerCase(),
            decoded.role || 'employee',
          ]
        )
        user = await db.get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [decoded.id])
      }
    } catch (dbErr) {
      // Ignore conflict errors during auto-heal
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
