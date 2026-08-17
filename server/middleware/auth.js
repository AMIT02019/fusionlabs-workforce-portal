import jwt from 'jsonwebtoken'
import { db } from '../db.js'

export const JWT_SECRET = process.env.JWT_SECRET || 'fusionlabs_super_secret_jwt_key_2026'

// Authenticate request token
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

    const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(decoded.id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
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
