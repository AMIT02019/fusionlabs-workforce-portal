import { useState } from 'react'
import { api, setToken } from '../../lib/api'
import { useAuth } from '../../lib/auth'

export default function AdminSettingsModal({ onClose, onUpdated }) {
  const { profile, setProfile } = useAuth()

  const [name, setName] = useState(profile?.name || 'Administrator')
  const [email, setEmail] = useState(profile?.email || 'admin@fusionlabs.com')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const cleanName = name.trim()
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanName || !cleanEmail) {
      setError('Name and Admin Email are required.')
      return
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters.')
        return
      }
      if (newPassword !== confirmPassword) {
        setError('New password and confirmation do not match.')
        return
      }
    }

    setLoading(true)

    try {
      const res = await api.auth.updateAdminProfile({
        name: cleanName,
        email: cleanEmail,
        newPassword: newPassword || undefined,
      })

      // Update session token and profile state
      if (res.token) {
        setToken(res.token)
      }
      if (res.user) {
        setProfile(res.user)
      }

      setSuccess(true)
      setLoading(false)
      if (onUpdated) onUpdated(res.user)
    } catch (err) {
      setError(err.message || 'Failed to update admin credentials. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚙️ Admin Account & Security
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {success ? (
            <div className="success-msg" style={{ padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>
                ✅ Credentials Updated!
              </div>
              <div style={{ fontSize: '13px', color: '#166534' }}>
                Your Administrator Email (ID) and Password have been saved. You can now use these credentials to log in.
              </div>
            </div>
          ) : (
            <>
              <p className="muted" style={{ marginBottom: '16px', fontSize: '13px' }}>
                Customize your Administrator credentials. Replace default <code>admin@fusionlabs.com</code> / <code>admin123</code> with your personal email and secure password.
              </p>

              <form onSubmit={handleSubmit} className="auth-form">
                <label className="field">
                  <span>Administrator Name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (error) setError('')
                    }}
                    required
                    placeholder="e.g. Administrator"
                  />
                </label>

                <label className="field">
                  <span>Admin Email (Login ID)</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (error) setError('')
                    }}
                    required
                    placeholder="admin@yourcompany.com"
                  />
                </label>

                <label className="field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>New Admin Password (Optional)</span>
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
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      if (error) setError('')
                    }}
                    placeholder="Leave blank to keep existing password"
                  />
                </label>

                {newPassword && (
                  <label className="field">
                    <span>Confirm New Admin Password</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (error) setError('')
                      }}
                      placeholder="Re-enter new password"
                    />
                  </label>
                )}

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
                {loading ? 'Saving...' : 'Save Admin Credentials'}
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
