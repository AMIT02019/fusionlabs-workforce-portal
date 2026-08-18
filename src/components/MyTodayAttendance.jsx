import { attendanceStatus } from '../lib/format'
import { statusClass } from '../lib/status'

export default function MyTodayAttendance({ profile, attendance }) {
  const checkedIn = !!attendance?.check_in
  const checkedOut = !!attendance?.check_out

  const status =
    attendance?.status ||
    (checkedIn
      ? checkedOut
        ? attendanceStatus(attendance?.working_minutes)
        : 'IN PROGRESS'
      : 'ABSENT')

  return (
    <section className="card" style={{ marginTop: '20px' }}>
      <div className="section-head" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Today's
          </div>
          <h2 className="section-title" style={{ fontSize: '20px', margin: '2px 0 0 0' }}>
            My Attendance
          </h2>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '60%' }}>Employee</th>
              <th style={{ width: '40%' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong style={{ fontSize: '15px' }}>{profile?.name || 'Employee'}</strong>
                <div className="muted small-text">{profile?.email}</div>
              </td>
              <td>
                <span className={`status-badge ${status === 'IN PROGRESS' ? 'status-halfday' : statusClass(status)}`} style={{ fontSize: '13px', padding: '6px 14px' }}>
                  {status === 'PRESENT'
                    ? '🟢 PRESENT'
                    : status === 'HALF DAY'
                    ? '🟡 HALF DAY'
                    : status === 'IN PROGRESS'
                    ? '⏳ In Progress'
                    : '🔴 ABSENT'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
