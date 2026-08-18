import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'
import {
  formatShortDate,
  formatDay,
  formatTime,
  formatDuration,
  dateKey,
} from '../lib/format'
import { statusClass } from '../lib/status'
import { exportToCSV } from '../lib/export'

export default function AttendanceHistory({ profile, weekMinutes, dayMinutes }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      const res = await api.attendance.getHistory()
      setRows(res.records || [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    load()
  }, [load])

  // Build a history calendar: show ABSENT for weekdays with no record
  const last14 = []
  const today = new Date()
  const byDate = {}
  ;(rows || []).forEach((r) => { byDate[r.attendance_date] = r })

  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = dateKey(d)
    const dow = d.getDay() // 0 Sun, 6 Sat
    const isWeekend = dow === 0 || dow === 6
    const record = byDate[key]
    if (record) {
      last14.push(record)
    } else if (!isWeekend) {
      last14.push({ attendance_date: key, check_in: null, check_out: null, working_minutes: null, status: 'ABSENT' })
    }
  }

  // Handle Weekly Export
  async function handleWeeklyExport() {
    try {
      // Fetch tasks for the current week
      const todayDate = new Date()
      const dayOfWeek = todayDate.getDay()
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const monday = new Date(todayDate)
      monday.setDate(todayDate.getDate() + diffToMonday)
      const mondayStr = dateKey(monday)
      const todayStr = dateKey(todayDate)

      const taskRes = await api.tasks.getMy({ fromDate: mondayStr, toDate: todayStr })
      const weekTasks = taskRes.tasks || []

      const attByDate = {}
      ;(rows || []).forEach((r) => { attByDate[r.attendance_date] = r })

      const headers = [
        'Date',
        'Day',
        'Project',
        'Task',
        'Start Time',
        'End Time',
        'Duration',
        'Attendance Check In',
        'Attendance Check Out',
        'Daily Hours',
        'Weekly Hours',
        'Status',
      ]

      const csvRows = []
      if (weekTasks.length > 0) {
        weekTasks.forEach((t) => {
          const att = attByDate[t.task_date]
          csvRows.push([
            t.task_date,
            formatDay(t.task_date),
            t.project_name,
            t.task_name,
            t.start_time ? formatTime(t.start_time) : '--',
            t.end_time ? formatTime(t.end_time) : '--',
            t.duration_minutes != null ? formatDuration(t.duration_minutes) : '--',
            att?.check_in ? formatTime(att.check_in) : '--',
            att?.check_out ? formatTime(att.check_out) : '--',
            att?.working_minutes != null ? formatDuration(att.working_minutes) : '--',
            weekMinutes != null ? formatDuration(weekMinutes) : '--',
            t.status,
          ])
        })
      } else {
        // If no tasks, export attendance records for the week
        last14.slice(0, 7).forEach((r) => {
          csvRows.push([
            r.attendance_date,
            formatDay(r.attendance_date),
            '--',
            '--',
            '--',
            '--',
            '--',
            r.check_in ? formatTime(r.check_in) : '--',
            r.check_out ? formatTime(r.check_out) : '--',
            r.working_minutes != null ? formatDuration(r.working_minutes) : '--',
            weekMinutes != null ? formatDuration(weekMinutes) : '--',
            r.status || 'ABSENT',
          ])
        })
      }

      exportToCSV(`${profile?.name?.replace(/\s+/g, '_') || 'Employee'}_Weekly_Report`, headers, csvRows)
    } catch (err) {
      alert('Failed to generate weekly export: ' + err.message)
    }
  }

  return (
    <section className="card" style={{ marginTop: '24px' }}>
      <div className="section-head">
        <div>
          <h2 className="section-title">My Attendance</h2>
          <p className="muted" style={{ fontSize: '13px', margin: '4px 0 0 0' }}>
            Historical record of your daily check-in, check-out, and attendance status
          </p>
        </div>
        <button
          className="btn btn-outline btn-sm"
          onClick={handleWeeklyExport}
          style={{ fontWeight: 600, borderColor: '#2563eb', color: '#2563eb' }}
        >
          📊 WEEKLY EXPORT
        </button>
      </div>

      {loading ? (
        <p className="muted">Loading attendance history…</p>
      ) : last14.length === 0 ? (
        <p className="muted">No attendance records yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Working Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {last14.map((r, i) => (
                <tr key={i}>
                  <td><strong>{formatShortDate(r.attendance_date)}</strong></td>
                  <td>{formatDay(r.attendance_date)}</td>
                  <td>{formatTime(r.check_in) || '--'}</td>
                  <td>{formatTime(r.check_out) || '--'}</td>
                  <td>{formatDuration(r.working_minutes) || '--'}</td>
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
