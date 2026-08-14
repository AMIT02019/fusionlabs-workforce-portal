import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { formatLongDate, formatTime, formatDuration, dateKey, attendanceStatus } from '../../lib/format'
import { statusClass, calCellClass, calDotClass } from '../../lib/status'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function AttendanceCalendar({ employees }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed
  const [selectedEmpId, setSelectedEmpId] = useState('all')
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null) // { date, status, record, empName }

  const load = useCallback(async () => {
    setLoading(true)
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    let query = supabase
      .from('attendance')
      .select('user_id, attendance_date, check_in, check_out, working_minutes, status')
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)

    if (selectedEmpId !== 'all') {
      query = query.eq('user_id', selectedEmpId)
    }

    const { data, error } = await query
    if (!error) setRecords(data || [])
    setLoading(false)
  }, [year, month, selectedEmpId])

  useEffect(() => {
    load()
  }, [load])

  function prevMonth() {
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  // Build calendar grid. Monday-first.
  const firstDay = new Date(year, month, 1)
  const firstDow = (firstDay.getDay() + 6) % 7 // 0 = Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = dateKey(today)

  // Map records by date. For "all employees" mode, aggregate per date.
  // For single employee, direct map.
  const byDate = {}
  if (selectedEmpId === 'all') {
    // Aggregate: for each date, collect statuses of all employees
    const dateStatuses = {}
    records.forEach((r) => {
      if (!dateStatuses[r.attendance_date]) dateStatuses[r.attendance_date] = []
      dateStatuses[r.attendance_date].push(r)
    })
    // For the calendar cell color, use the "worst" status present that day
    // (absent > halfday > present for visibility), but actually show a
    // multi-dot if mixed. Simplify: show a blended dot if any present/half/absent.
    Object.keys(dateStatuses).forEach((d) => {
      const statuses = dateStatuses[d].map((r) => r.status || attendanceStatus(r.working_minutes))
      byDate[d] = { statuses, records: dateStatuses[d] }
    })
  } else {
    records.forEach((r) => {
      byDate[r.attendance_date] = { statuses: [r.status || attendanceStatus(r.working_minutes)], records: [r] }
    })
  }

  const empName = selectedEmpId === 'all'
    ? 'All Employees'
    : employees.find((e) => e.id === selectedEmpId)?.name || 'Employee'

  function cellStatus(dateStr) {
    const entry = byDate[dateStr]
    if (!entry) {
      // No record — absent if it's a past weekday
      const d = new Date(dateStr + 'T00:00:00')
      const dow = d.getDay()
      if (dow === 0 || dow === 6) return null // weekend
      if (dateStr >= todayKey) return null // today or future — no absent
      return 'ABSENT'
    }
    // For all-employees view, pick the dominant status for cell color
    const s = entry.statuses
    if (s.includes('PRESENT')) return 'PRESENT'
    if (s.includes('HALF DAY')) return 'HALF DAY'
    if (s.includes('ABSENT')) return 'ABSENT'
    return null
  }

  function handleCellClick(dateStr) {
    const entry = byDate[dateStr]
    const cellStat = cellStatus(dateStr)
    if (!entry && !cellStat) return

    const d = new Date(dateStr + 'T00:00:00')
    const dow = d.getDay()
    const isWeekend = dow === 0 || dow === 6

    setDetail({
      date: dateStr,
      empName,
      isWeekend,
      status: cellStat,
      records: entry?.records || [],
    })
  }

  // Build cells
  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const d = new Date(dateStr + 'T00:00:00')
    const dow = d.getDay()
    const isWeekend = dow === 0 || dow === 6
    const isFuture = dateStr > todayKey
    const stat = cellStatus(dateStr)
    const hasRecord = !!byDate[dateStr]
    cells.push({ dateStr, day, isWeekend, isFuture, stat, hasRecord })
  }

  return (
    <section className="card">
      <h2 className="section-title">Attendance Calendar</h2>

      <div className="filters-bar">
        <label className="field">
          <span>Employee</span>
          <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)}>
            <option value="all">All Employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="calendar-nav">
        <button className="btn btn-outline btn-sm" onClick={prevMonth}>&lsaquo; Prev</button>
        <div className="cal-month-label">{MONTH_NAMES[month]} {year}</div>
        <button className="btn btn-outline btn-sm" onClick={nextMonth}>Next &rsaquo;</button>
      </div>

      {loading ? (
        <p className="muted">Loading calendar…</p>
      ) : (
        <>
          <div className="cal-grid">
            {DOW_LABELS.map((d) => (
              <div key={d} className="cal-dow">{d}</div>
            ))}
            {cells.map((cell, i) => {
              if (!cell) return <div key={i} className="cal-cell cal-empty" />
              const clickable = cell.stat != null || cell.hasRecord
              const classes = [
                'cal-cell',
                cell.isWeekend ? 'cal-weekend' : '',
                cell.isFuture ? 'cal-future' : '',
                clickable ? 'cal-clickable' : '',
                calCellClass(cell.stat),
              ].filter(Boolean).join(' ')
              return (
                <div
                  key={i}
                  className={classes}
                  onClick={() => clickable && handleCellClick(cell.dateStr)}
                >
                  <div className="cal-day-num">{cell.day}</div>
                  {cell.stat && <div className={`cal-dot ${calDotClass(cell.stat)}`} />}
                </div>
              )
            })}
          </div>

          <div className="cal-legend">
            <div className="cal-legend-item">
              <div className="cal-legend-dot" style={{ background: 'var(--present)' }} />
              Present
            </div>
            <div className="cal-legend-item">
              <div className="cal-legend-dot" style={{ background: 'var(--halfday)' }} />
              Half Day
            </div>
            <div className="cal-legend-item">
              <div className="cal-legend-dot" style={{ background: 'var(--absent)' }} />
              Absent
            </div>
          </div>
        </>
      )}

      {detail && (
        <CalendarDetailModal
          detail={detail}
          employees={employees}
          selectedEmpId={selectedEmpId}
          onClose={() => setDetail(null)}
        />
      )}
    </section>
  )
}

function CalendarDetailModal({ detail, employees, selectedEmpId, onClose }) {
  const isSingle = selectedEmpId !== 'all'
  const targetEmployees = isSingle
    ? employees.filter((e) => e.id === selectedEmpId)
    : employees

  const todayStr = dateKey(new Date())

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {isSingle ? `${targetEmployees[0]?.name || 'Employee'} - ` : ''}Attendance for {formatLongDate(new Date(detail.date + 'T00:00:00'))}
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {detail.isWeekend && !detail.records.length && (
            <p className="muted" style={{ marginBottom: '16px' }}>Non-working day (weekend).</p>
          )}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {!isSingle && <th>Employee</th>}
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Working Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {targetEmployees.map((emp) => {
                  const r = detail.records.find((rec) => rec.user_id === emp.id)
                  let status = r?.status || (r?.working_minutes != null ? attendanceStatus(r.working_minutes) : null)
                  if (!status) {
                    if (detail.isWeekend) {
                      status = null
                    } else if (detail.date > todayStr) {
                      status = null
                    } else {
                      status = 'ABSENT'
                    }
                  }

                  return (
                    <tr key={emp.id}>
                      {!isSingle && <td>{emp.name}</td>}
                      <td>{r?.check_in ? formatTime(r.check_in) : '--'}</td>
                      <td>{r?.check_out ? formatTime(r.check_out) : '--'}</td>
                      <td>{r?.working_minutes != null ? formatDuration(r.working_minutes) : '--'}</td>
                      <td>
                        {status ? (
                          <span className={`status-badge ${statusClass(status)}`}>
                            {status === 'PRESENT'
                              ? '🟢 PRESENT'
                              : status === 'HALF DAY'
                              ? '🟡 HALF DAY'
                              : '🔴 ABSENT'}
                          </span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
