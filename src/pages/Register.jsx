import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'

export default function Register() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

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
      const res = await api.auth.register(name, email, password)
      setLoading(false)
      setSuccess(true)
      signIn(res.user, res.token)
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
    } catch (err) {
      setError(err.message || 'Failed to create account.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="success-msg">
            ✨ Account created successfully!
          </div>
          <p className="auth-switch" style={{ marginTop: '16px' }}>Redirecting to your dashboard…</p>
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
              onChange={(e) => setName(e.target.value)}
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
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </label>

          <label className="field">
            <span>Confirm Password</span>
            <input
              type="password"
              placeholder="Re-enter password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </label>

          {error && <p className="form-error">{error}</p>}

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
