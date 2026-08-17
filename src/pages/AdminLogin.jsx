import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('admin@fusionlabs.com')
  const [password, setPassword] = useState('admin123')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !password) {
      setError('Please enter both admin email and password.')
      return
    }

    setLoading(true)

    try {
      const res = await api.auth.login(cleanEmail, password)

      if (res.user?.role !== 'admin') {
        setError('Access denied: This account does not have administrator privileges.')
        setLoading(false)
        return
      }

      signIn(res.user, res.token)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid administrator email or password. Please try again.')
      setLoading(false)
    }
  }

  function handleFillAdmin() {
    setEmail('admin@fusionlabs.com')
    setPassword('admin123')
    setError('')
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
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError('')
              }}
              required
              autoComplete="email"
            />
          </label>

          <label className="field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Admin Password</span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError('')
              }}
              required
              autoComplete="current-password"
            />
          </label>

          {error && (
            <div className="form-error" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? 'Authenticating...' : 'Sign In as Admin'}
          </button>
        </form>

        <div style={{ marginTop: '16px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b' }}>
          <div>
            <strong>Admin Credentials:</strong><br />
            <code>admin@fusionlabs.com</code> / <code>admin123</code>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleFillAdmin}
            style={{ fontSize: '11px', padding: '4px 8px' }}
          >
            Autofill
          </button>
        </div>

        <p className="admin-back" style={{ marginTop: '16px' }}>
          <Link to="/login">&larr; Switch to Employee Login</Link>
        </p>
      </div>
    </div>
  )
}
