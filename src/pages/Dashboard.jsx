import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import {
  formatLongDate,
  formatShortDate,
  formatDay,
  formatTime,
  formatDuration,
  dateKey,
  attendanceStatus,
  minutesBetween,
} from '../lib/format'
import { statusClass } from '../lib/status'
import TaskSection from '../components/TaskSection'
import AttendanceHistory from '../components/AttendanceHistory'

export default function Dashboard() {
  const { profile, signOut } = useAuth()
  const today = dateKey(new Date())

  const [attendance, setAttendance] = useState(null)
  const [loadingAtt, setLoadingAtt] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [attError, setAttError] = useState('')

  const loadTodayAttendance = useCallback(async () => {
    if (!profile) return
    setLoadingAtt(true)
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', profile.id)
      .eq('attendance_date', today)
      .maybeSingle()

    if (error) setAttError(error.message)
    setAttendance(data || null)
    setLoadingAtt(false)
  }, [profile, today])

  useEffect(() => {
    loadTodayAttendance()
  }, [loadTodayAttendance])

  async function handleCheckIn() {
    setActionLoading(true)
    setAttError('')
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('attendance')
      .insert({
        user_id: profile.id,
        attendance_date: today,
        check_in: now,
      })
    if (error) {
      setAttError(error.message)
      setActionLoading(false)
      return
    }
    await loadTodayAttendance()
    setActionLoading(false)
  }

  async function handleCheckOut() {
    if (!attendance?.check_in) return
    setActionLoading(true)
    setAttError('')
    const now = new Date()
    const mins = minutesBetween(attendance.check_in, now)
    const status = attendanceStatus(mins)
    const { error } = await supabase
      .from('attendance')
      .update({
        check_out: now.toISOString(),
        working_minutes: mins,
        status,
      })
      .eq('id', attendance.id)
    if (error) {
      setAttError(error.message)
      setActionLoading(false)
      return
    }
    await loadTodayAttendance()
    setActionLoading(false)
  }

  const checkedIn = !!attendance?.check_in
  const checkedOut = !!attendance?.check_out
  const status = attendance?.status || (checkedIn && !checkedOut ? null : 'ABSENT')

  return (
    <div className="dashboard">
      <div className="dash-top">
        <div>
          <h1 className="dash-welcome">Welcome, {profile?.name}</h1>
          <p className="dash-date">Today's Date: {formatLongDate(new Date())}</p>
        </div>
        <button className="btn btn-outline" onClick={signOut}>Logout</button>
      </div>

      <section className="card">
        <h2 className="section-title">Today's Attendance</h2>

        <div className="att-grid">
          <div className="att-field">
            <span className="att-label">Check In:</span>
            <span className="att-value">
              {attendance?.check_in ? formatTime(attendance.check_in) : '--'}
            </span>
          </div>
          <div className="att-field">
            <span className="att-label">Check Out:</span>
            <span className="att-value">
              {attendance?.check_out ? formatTime(attendance.check_out) : '--'}
            </span>
          </div>
          <div className="att-field">
            <span className="att-label">Working Hours:</span>
            <span className="att-value">
              {attendance?.working_minutes != null ? formatDuration(attendance.working_minutes) : '--'}
            </span>
          </div>
          <div className="att-field">
            <span className="att-label">Status:</span>
            <span className={`status-badge ${statusClass(status)}`}>
              {status || '--'}
            </span>
          </div>
        </div>

        {attError && <p className="form-error">{attError}</p>}

        <div className="att-actions">
          <button
            className="btn btn-primary"
            onClick={handleCheckIn}
            disabled={checkedIn || loadingAtt || actionLoading}
          >
            {checkedIn ? (attendance?.check_in ? `Checked in at ${formatTime(attendance.check_in)}` : 'Check In') : 'CHECK IN'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCheckOut}
            disabled={!checkedIn || checkedOut || loadingAtt || actionLoading}
          >
            {checkedOut ? (attendance?.check_out ? `Checked out at ${formatTime(attendance.check_out)}` : 'Check Out') : 'CHECK OUT'}
          </button>
        </div>
      </section>

      <TaskSection profile={profile} today={today} />

      <AttendanceHistory profile={profile} />
    </div>
  )
}
