import { useState } from 'react'
import { api } from '../../lib/api'

export default function DeleteEmployeeModal({ employee, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    setError('')
    setLoading(true)

    try {
      await api.employees.delete(employee.id)
      onDeleted(employee)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to remove employee.')
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚠️ Confirm Employee Removal
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <p style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.5' }}>
            Are you sure you want to permanently remove <strong>{employee.name}</strong> ({employee.email})?
          </p>
          <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', fontSize: '13px', color: '#991b1b', marginBottom: '16px' }}>
            <strong>Warning:</strong> This action cannot be undone. All recorded attendance history and daily work tasks for this employee will be deleted.
          </div>

          {error && <p className="form-error">{error}</p>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Deleting...' : 'Yes, Delete Employee'}
          </button>
        </div>
      </div>
    </div>
  )
}
