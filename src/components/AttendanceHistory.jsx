import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  formatShortDate,
  formatDay,
  formatTime,
  formatDuration,
} from '../lib/format'
import { statusClass } from '../lib/status'

export default function AttendanceHistory({ profile }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    const { data, error } = await supabase
      .from('attendance')
      .select('attendance_date, check_in, check_out, working_minutes, status')
      .eq('user_id', profile.id)
      .order('attendance_date', { ascending: false })
      .limit(30)

    if (error) {
      setLoading(false)
      return
    }
    setRows(data || [])
    setLoading(false)
  }, [profile])

  useEffect(() => {
    load()
  }, [load])

  // Build a calendar of the last 14 days: show ABSENT for weekdays with no record
  const last14 = []
  const today = new Date()
  const byDate = {}
  ;(rows || []).forEach((r) => { byDate[r.attendance_date] = r })

  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const dow = d.getDay() // 0 Sun, 6 Sat
    const isWeekend = dow === 0 || dow === 6
    const record = byDate[key]
    if (record) {
      last14.push(record)
    } else if (!isWeekend) {
      last14.push({ attendance_date: key, check_in: null, check_out: null, working_minutes: null, status: 'ABSENT' })
    }
  }

  return (
    <section className="card">
      <h2 className="section-title">My Attendance</h2>

      {loading ? (
        <p className="muted">Loading…</p>
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
                  <td>{formatShortDate(r.attendance_date)}</td>
                  <td>{formatDay(r.attendance_date)}</td>
                  <td>{formatTime(r.check_in) || '--'}</td>
                  <td>{formatTime(r.check_out) || '--'}</td>
                  <td>{formatDuration(r.working_minutes) || '--'}</td>
                  <td>
                    <span className={`status-badge ${statusClass(r.status)}`}>
                      {r.status || '--'}
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
