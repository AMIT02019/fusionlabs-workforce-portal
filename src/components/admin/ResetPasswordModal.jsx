import { useState } from 'react'
// ResetPasswordModal calls the edge function via fetch; no direct supabase import needed.

export default function ResetPasswordModal({ employee, onClose, session }) {
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId: employee.id, newPassword }),
        }
      )

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || 'Failed to reset password.')
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Reset Password</div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {success ? (
            <div className="success-msg">
              Password reset successfully for {employee.name}.
            </div>
          ) : (
            <>
              <p className="muted" style={{ marginBottom: '16px' }}>
                Set a new temporary password for <strong>{employee.name}</strong> ({employee.email}).
              </p>
              <form onSubmit={handleSubmit} className="auth-form">
                <label className="field">
                  <span>New Password</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    autoFocus
                  />
                </label>
                {error && <p className="form-error">{error}</p>}
              </form>
            </>
          )}
        </div>

        {!success && (
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        )}

        {success && (
          <div className="modal-footer">
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}
