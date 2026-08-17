import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'

export default function Login() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !password) {
      setError('Please enter both your work email and password.')
      return
    }

    setLoading(true)

    try {
      const res = await api.auth.login(cleanEmail, password)
      signIn(res.user, res.token)

      if (res.user.role === 'admin') {
        navigate('/admin', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Invalid work email or password. Please try again.')
      setLoading(false)
    }
  }

  function handleDemoFill() {
    setEmail('alex@fusionlabs.com')
    setPassword('employee123')
    setError('')
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <span className="home-brand-badge">EMPLOYEE PORTAL</span>
        </div>
        <h2 className="auth-title">Welcome Back</h2>
        <p className="home-subtitle" style={{ marginTop: '-16px', marginBottom: '24px' }}>
          Log in to record your attendance & work
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field">
            <span>Work Email</span>
            <input
              type="email"
              placeholder="alex@fusionlabs.com"
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
              <span>Password</span>
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
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '16px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b' }}>
          <div>
            <strong>Sample Employee:</strong><br />
            <code>alex@fusionlabs.com</code> / <code>employee123</code>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleDemoFill}
            style={{ fontSize: '11px', padding: '4px 8px' }}
          >
            Autofill
          </button>
        </div>

        <p className="auth-switch" style={{ marginTop: '16px' }}>
          Don't have an account? <Link to="/register">Create Account</Link>
        </p>

        <p className="admin-back" style={{ marginTop: '12px' }}>
          <Link to="/admin-login">Go to Admin Login &rarr;</Link>
        </p>
      </div>
    </div>
  )
}
