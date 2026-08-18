import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import ForgotPasswordModal from '../components/ForgotPasswordModal'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfoMessage('')

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !password) {
      setError('Please enter both admin email and password.')
      return
    }

    setLoading(true)

    try {
      const res = await api.auth.login(cleanEmail, password)

      if (res.user?.role !== 'admin') {
        setError('You do not have permission to access the admin panel.')
        setLoading(false)
        return
      }

      signIn(res.user, res.token)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid email or password.')
      setLoading(false)
    }
  }

  function handlePasswordResetSuccess(resetEmail) {
    setShowForgotPassword(false)
    setEmail(resetEmail)
    setPassword('')
    setInfoMessage('✨ Admin password reset successfully! Please sign in with your new password.')
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

        {infoMessage && (
          <div className="success-msg" style={{ marginBottom: '16px', fontSize: '13px' }}>
            {infoMessage}
          </div>
        )}

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
            {loading ? 'Authenticating...' : 'Sign In as Admin'}
          </button>
        </form>

        <p className="admin-back" style={{ marginTop: '20px' }}>
          <Link to="/login">&larr; Switch to Employee Login</Link>
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
