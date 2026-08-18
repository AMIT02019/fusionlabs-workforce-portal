import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { attendanceStatus } from '../lib/format'
import { statusClass } from '../lib/status'

export default function TodayAttendanceList({ today, currentUserId }) {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.employees.list(today)
      setEmployees(res.employees || [])
    } catch (err) {
      console.error('Failed to load today attendance list:', err)
    } finally {
      setLoading(false)
    }
  }, [today])

  useEffect(() => {
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [load])

  return (
    <section className="card" style={{ marginTop: '20px' }}>
      <div className="section-head">
        <h2 className="section-title">Today's My Attendance</h2>
      </div>

      {loading ? (
        <p className="muted">Loading attendance status…</p>
      ) : employees.length === 0 ? (
        <p className="muted">No employee attendance records for today.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const isYou = emp.id === currentUserId
                const status = emp.today_status || (emp.check_in ? (emp.check_out ? attendanceStatus(emp.working_minutes) : 'IN PROGRESS') : 'ABSENT')
                return (
                  <tr key={emp.id}>
                    <td>
                      <strong>{emp.name}</strong>
                      {isYou && <span className="muted small-text"> (You)</span>}
                      <div className="muted small-text">{emp.email}</div>
                    </td>
                    <td>
                      <span className={`status-badge ${status === 'IN PROGRESS' ? 'status-halfday' : statusClass(status)}`}>
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
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
