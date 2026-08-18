import { useState, useEffect, useCallback } from 'react'
import { api } from '../../lib/api'
import {
  formatShortDate,
  formatDay,
  formatTime,
  formatDuration,
  dateKey,
} from '../../lib/format'
import { statusClass } from '../../lib/status'
import { exportToCSV } from '../../lib/export'

export default function AttendanceHistoryAdmin({ employees, today }) {
  const todayDate = new Date()
  const firstOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)

  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState('all')
  const [fromDate, setFromDate] = useState(dateKey(firstOfMonth))
  const [toDate, setToDate] = useState(today)
  const [search, setSearch] = useState('')

  const loadAttendance = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.attendance.getAll({
        userId: selectedUser,
        fromDate,
        toDate,
        search,
      })
      setRecords(res.records || [])
    } catch (err) {
      console.error('Failed to load admin attendance history:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedUser, fromDate, toDate, search])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

  function handleExportAttendance() {
    const headers = [
      'Date',
      'Day',
      'Employee',
      'Email',
      'Check In',
      'Check Out',
      'Working Hours',
      'Status',
    ]
    const rows = records.map((r) => [
      r.attendance_date,
      formatDay(r.attendance_date),
      r.name,
      r.email,
      r.check_in ? formatTime(r.check_in) : '--',
      r.check_out ? formatTime(r.check_out) : '--',
      r.working_minutes != null ? formatDuration(r.working_minutes) : '--',
      r.status || 'ABSENT',
    ])
    exportToCSV(`Attendance_History_${fromDate}_to_${toDate}`, headers, rows)
  }

  return (
    <section className="card" style={{ marginTop: '24px' }}>
      <div className="section-head">
        <div>
          <h2 className="section-title">Attendance History ({records.length})</h2>
          <p className="muted" style={{ fontSize: '13px', margin: '4px 0 0 0' }}>
            Filter and review check-in/out records across all team members
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleExportAttendance} disabled={records.length === 0}>
          📥 Export CSV
        </button>
      </div>

      <div className="filters-bar" style={{ marginBottom: '16px' }}>
        <label className="field search-field">
          <span>Search Employee</span>
          <input
            type="text"
            placeholder="Type name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Employee</span>
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
            <option value="all">All Employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>From Date</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            max={toDate}
          />
        </label>
        <label className="field">
          <span>To Date</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            min={fromDate}
            max={today}
          />
        </label>
      </div>

      {loading ? (
        <p className="muted">Loading attendance records…</p>
      ) : records.length === 0 ? (
        <p className="muted">No attendance records found for the selected filters.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Employee</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Working Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i}>
                  <td><strong>{formatShortDate(r.attendance_date)}</strong></td>
                  <td>{formatDay(r.attendance_date)}</td>
                  <td>
                    <strong>{r.name}</strong>
                    <div className="muted small-text">{r.email}</div>
                  </td>
                  <td>{r.check_in ? formatTime(r.check_in) : '--'}</td>
                  <td>{r.check_out ? formatTime(r.check_out) : '--'}</td>
                  <td>{r.working_minutes != null ? formatDuration(r.working_minutes) : '--'}</td>
                  <td>
                    <span className={`status-badge ${statusClass(r.status)}`}>
                      {r.status === 'PRESENT'
                        ? '🟢 PRESENT'
                        : r.status === 'HALF DAY'
                        ? '🟡 HALF DAY'
                        : '🔴 ABSENT'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
