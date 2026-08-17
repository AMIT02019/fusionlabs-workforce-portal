import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'

export default function Login() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.auth.login(email, password)
      signIn(res.user, res.token)

      if (res.user.role === 'admin') {
        navigate('/admin', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password.')
      setLoading(false)
    }
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
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="field">
            <span>Password</span>
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
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Create Account</Link>
        </p>

        <p className="admin-back" style={{ marginTop: '16px' }}>
          <Link to="/admin-login">Go to Admin Login &rarr;</Link>
        </p>
      </div>
    </div>
  )
}
