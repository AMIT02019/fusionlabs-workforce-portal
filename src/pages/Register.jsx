import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name.trim()

    if (!cleanName || !cleanEmail || !password) {
      setError('Please fill in all required fields.')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    try {
      await api.auth.register(cleanName, cleanEmail, password)
      setLoading(false)
      setSuccess(true)
      // Navigate to login page so user logs in with their newly created credentials
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: {
            registeredEmail: cleanEmail,
            message: '✨ Account created successfully! Please sign in with your email and password.',
          },
        })
      }, 1500)
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="success-msg" style={{ padding: '16px', borderRadius: '8px' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>
              ✨ Account Created Successfully!
            </div>
            <div>Redirecting you to the login page to sign in…</div>
          </div>
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: '20px' }}
            onClick={() =>
              navigate('/login', {
                replace: true,
                state: {
                  registeredEmail: email.trim().toLowerCase(),
                  message: '✨ Account created successfully! Please sign in.',
                },
              })
            }
          >
            Go to Login Now &rarr;
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <span className="home-brand-badge">NEW EMPLOYEE</span>
        </div>
        <h2 className="auth-title">Create Account</h2>
        <p className="home-subtitle" style={{ marginTop: '-16px', marginBottom: '24px' }}>
          Join your team on FusionLabs Digital
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field">
            <span>Full Name</span>
            <input
              type="text"
              placeholder="e.g. Alex Morgan"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError('')
              }}
              required
              autoComplete="name"
            />
          </label>

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
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError('')
              }}
              required
              autoComplete="new-password"
            />
          </label>

          <label className="field">
            <span>Confirm Password</span>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Re-enter password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value)
                if (error) setError('')
              }}
              required
              autoComplete="new-password"
            />
          </label>

          {error && (
            <div className="form-error" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  )
}
