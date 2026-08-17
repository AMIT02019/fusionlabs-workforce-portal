import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import ForgotPasswordModal from '../components/ForgotPasswordModal'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn } = useAuth()

  const [email, setEmail] = useState(location.state?.registeredEmail || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState(location.state?.message || '')
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  useEffect(() => {
    if (location.state?.registeredEmail) {
      setEmail(location.state.registeredEmail)
    }
    if (location.state?.message) {
      setInfoMessage(location.state.message)
    }
  }, [location.state])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfoMessage('')

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

  function handlePasswordResetSuccess(resetEmail) {
    setShowForgotPassword(false)
    setEmail(resetEmail)
    setPassword('')
    setInfoMessage('✨ Password reset successfully! Please sign in with your new password.')
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

        {infoMessage && (
          <div className="success-msg" style={{ marginBottom: '16px', fontSize: '13px' }}>
            {infoMessage}
          </div>
        )}

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
                  color: '#2563eb',
                  fontSize: '11px',
                  cursor: 'pointer',
                  padding: 0,
                  fontWeight: 500,
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div style={{ position: 'relative' }}>
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
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#64748b',
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-4px', marginBottom: '8px' }}>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '2px 0',
                textDecoration: 'underline',
              }}
            >
              Forgot Password?
            </button>
          </div>

          {error && (
            <div className="form-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c' }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch" style={{ marginTop: '20px' }}>
          Don't have an account? <Link to="/register">Create Account</Link>
        </p>

        <p className="admin-back" style={{ marginTop: '12px' }}>
          <Link to="/admin-login">Go to Admin Login &rarr;</Link>
        </p>
      </div>

      {showForgotPassword && (
        <ForgotPasswordModal
          initialEmail={email}
          onClose={() => setShowForgotPassword(false)}
          onSuccess={handlePasswordResetSuccess}
        />
      )}
    </div>
  )
}
