import { useState } from 'react'
import { api } from '../lib/api'

export default function ForgotPasswordModal({ initialEmail = '', onClose, onSuccess }) {
  const [email, setEmail] = useState(initialEmail)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setError('Please enter your work email address.')
      return
    }

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      await api.auth.forgotPassword(cleanEmail, newPassword)
      setSuccess(true)
      setLoading(false)
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please check your email address.')
      setLoading(false)
    }
  }

  function handleFinish() {
    if (onSuccess) {
      onSuccess(email.trim().toLowerCase())
    } else {
      onClose()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔑 Reset Password
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {success ? (
            <div className="success-msg" style={{ padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
                ✨ Password Reset Successfully!
              </div>
              <div style={{ fontSize: '13px', color: '#166534' }}>
                Your password for <strong>{email.trim().toLowerCase()}</strong> has been updated. You can now log in with your new password.
              </div>
            </div>
          ) : (
            <>
              <p className="muted" style={{ marginBottom: '16px', fontSize: '13px' }}>
                Enter your registered work email and choose a new secure password.
              </p>

              <form onSubmit={handleSubmit} className="auth-form">
                <label className="field">
                  <span>Registered Work Email</span>
                  <input
                    type="email"
                    placeholder="e.g. alex@fusionlabs.com"
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
                    <span>New Password</span>
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
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      if (error) setError('')
                    }}
                    required
                    autoComplete="new-password"
                  />
                </label>

                <label className="field">
                  <span>Confirm New Password</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
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
              </form>
            </>
          )}
        </div>

        <div className="modal-footer">
          {!success ? (
            <>
              <button className="btn btn-outline" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={handleFinish}>
              Sign In with New Password &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
