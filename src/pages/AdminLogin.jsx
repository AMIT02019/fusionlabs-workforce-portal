import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('admin@fusionlabs.com')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.auth.login(email, password)

      if (res.user?.role !== 'admin') {
        setError('Access denied: This account is not an administrator.')
        setLoading(false)
        return
      }

      signIn(res.user, res.token)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid administrator email or password.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="admin-login-card">
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <span className="home-brand-badge" style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fecdd3' }}>
            🛡️ ADMIN ACCESS
          </span>
        </div>
        <div className="admin-brand">FusionLabs Digital</div>
        <div className="admin-brand-sub">Management & Oversight Portal</div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field">
            <span>Admin Email</span>
            <input
              type="email"
              placeholder="admin@fusionlabs.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="field">
            <span>Admin Password</span>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? 'Authenticating...' : 'Sign In as Admin'}
          </button>
        </form>

        <div style={{ marginTop: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
          <strong>Default Admin Credentials:</strong><br />
          Email: <code>admin@fusionlabs.com</code><br />
          Password: <code>admin123</code>
        </div>

        <p className="admin-back">
          <Link to="/login">&larr; Switch to Employee Login</Link>
        </p>
      </div>
    </div>
  )
}
