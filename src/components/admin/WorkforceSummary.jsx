import { useState, useEffect, useMemo } from 'react'
import { api } from '../../lib/api'
import { dateKey } from '../../lib/format'
import { exportToCSV } from '../../lib/export'

// Calculate working days (Monday-Friday) between fromDate and toDate inclusive
export function countWorkingDays(fromStr, toStr) {
  if (!fromStr || !toStr) return 0
  const start = new Date(fromStr + 'T00:00:00')
  const end = new Date(toStr + 'T00:00:00')
  if (start > end) return 0

  let count = 0
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) {
      count++
    }
  }
  return count
}

export default function WorkforceSummary({ employees, today }) {
  const todayDate = new Date()
  const firstOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)

  const [selectedEmpId, setSelectedEmpId] = useState('all')
  const [fromDate, setFromDate] = useState(dateKey(firstOfMonth))
  const [toDate, setToDate] = useState(today)
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAttendance() {
      setLoading(true)
      try {
        const res = await api.attendance.getAll({
          userId: selectedEmpId,
          fromDate,
          toDate,
        })
        setAttendanceRecords(res.records || [])
      } catch (err) {
        console.error('Failed to load workforce attendance:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAttendance()
  }, [selectedEmpId, fromDate, toDate])

  // Compute stats per employee
  const activeWorkingDays = useMemo(() => {
    return countWorkingDays(fromDate, toDate)
  }, [fromDate, toDate])

  const targetEmployees = useMemo(() => {
    if (selectedEmpId === 'all') return employees
    return employees.filter((e) => e.id === selectedEmpId)
  }, [employees, selectedEmpId])

  const summaryData = useMemo(() => {
    // Map records by user_id
    const userMap = {}
    attendanceRecords.forEach((r) => {
      if (!userMap[r.user_id]) userMap[r.user_id] = []
      userMap[r.user_id].push(r)
    })

    return targetEmployees.map((emp) => {
      const records = userMap[emp.id] || []
      let presentCount = 0
      let halfDayCount = 0

      records.forEach((r) => {
        if (r.status === 'PRESENT') {
          presentCount++
        } else if (r.status === 'HALF DAY') {
          halfDayCount++
        }
      })

      const absentCount = Math.max(0, activeWorkingDays - presentCount - halfDayCount)

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        dateRange: `${fromDate} to ${toDate}`,
        activeDays: activeWorkingDays,
        presentDays: presentCount,
        halfDays: halfDayCount,
        absentDays: absentCount,
      }
    })
  }, [targetEmployees, attendanceRecords, activeWorkingDays, fromDate, toDate])

  function handleExportSummary() {
    const headers = [
      'Employee',
      'From Date',
      'To Date',
      'Active Working Days',
      'Present Days',
      'Half Days',
      'Absent Days',
    ]
    const rows = summaryData.map((row) => [
      row.name,
      fromDate,
      toDate,
      row.activeDays,
      row.presentDays,
      row.halfDays,
      row.absentDays,
    ])
    exportToCSV(`Workforce_Summary_${fromDate}_to_${toDate}`, headers, rows)
  }

  return (
    <section className="card" style={{ marginTop: '24px' }}>
      <div className="section-head">
        <div>
          <h2 className="section-title">All Workforce</h2>
          <p className="muted" style={{ fontSize: '13px', margin: '4px 0 0 0' }}>
            Workforce summary metrics and dynamic active working day calculations
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleExportSummary}
          disabled={summaryData.length === 0}
          style={{ fontWeight: 600 }}
        >
          📥 EXPORT
        </button>
      </div>

      {/* Filters: Employee, From Date, To Date */}
      <div className="filters-bar" style={{ marginBottom: '16px' }}>
        <label className="field">
          <span>Employee</span>
          <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)}>
            <option value="all">All Employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.email})
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
        <p className="muted">Calculating workforce statistics…</p>
      ) : summaryData.length === 0 ? (
        <p className="muted">No employee data found for the selected range.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date Range</th>
                <th>Monthly Active Days</th>
                <th>Total Present Days</th>
                <th>Total Half Days</th>
                <th>Total Absent Days</th>
              </tr>
            </thead>
            <tbody>
              {summaryData.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                    <div className="muted small-text">{row.email}</div>
                  </td>
                  <td>{row.dateRange}</td>
                  <td><strong>{row.activeDays} days</strong></td>
                  <td>
                    <span className="status-badge status-present">
                      🟢 {row.presentDays}
                    </span>
                  </td>
                  <td>
                    <span className="status-badge status-halfday">
                      🟡 {row.halfDays}
                    </span>
                  </td>
                  <td>
                    <span className="status-badge status-absent">
                      🔴 {row.absentDays}
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
