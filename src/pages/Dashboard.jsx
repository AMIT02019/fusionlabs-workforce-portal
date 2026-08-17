import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import {
  formatLongDate,
  formatTime,
  formatDuration,
  dateKey,
  minutesBetween,
} from '../lib/format'
import { statusClass } from '../lib/status'
import TaskSection from '../components/TaskSection'
import AttendanceHistory from '../components/AttendanceHistory'
import ChangePasswordModal from '../components/ChangePasswordModal'

export default function Dashboard() {
  const { profile, signOut } = useAuth()
  const today = dateKey(new Date())

  const [attendance, setAttendance] = useState(null)
  const [loadingAtt, setLoadingAtt] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [attError, setAttError] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [liveElapsedMinutes, setLiveElapsedMinutes] = useState(null)

  const loadTodayAttendance = useCallback(async () => {
    if (!profile) return
    setLoadingAtt(true)
    try {
      const res = await api.attendance.getToday(today)
      setAttendance(res.attendance || null)
    } catch (err) {
      setAttError(err.message)
    } finally {
      setLoadingAtt(false)
    }
  }, [profile, today])

  useEffect(() => {
    loadTodayAttendance()
  }, [loadTodayAttendance])

  // Live timer for active check-in
  useEffect(() => {
    if (attendance?.check_in && !attendance?.check_out) {
      const updateElapsed = () => {
        const mins = minutesBetween(attendance.check_in, new Date())
        setLiveElapsedMinutes(mins)
      }
      updateElapsed()
      const timer = setInterval(updateElapsed, 30000)
      return () => clearInterval(timer)
    } else {
      setLiveElapsedMinutes(null)
    }
  }, [attendance?.check_in, attendance?.check_out])

  async function handleCheckIn() {
    setActionLoading(true)
    setAttError('')
    try {
      const res = await api.attendance.checkIn(today)
      setAttendance(res.attendance)
    } catch (err) {
      setAttError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCheckOut() {
    if (!attendance?.check_in) return
    setActionLoading(true)
    setAttError('')
    try {
      const res = await api.attendance.checkOut(today)
      setAttendance(res.attendance)
    } catch (err) {
      setAttError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const checkedIn = !!attendance?.check_in
  const checkedOut = !!attendance?.check_out
  const status = attendance?.status || (checkedIn && !checkedOut ? 'IN PROGRESS' : 'ABSENT')

  return (
    <div className="dashboard">
      <div className="dash-top">
        <div>
          <h1 className="dash-welcome">Welcome, {profile?.name}</h1>
          <p className="dash-date">Today's Date: {formatLongDate(new Date())}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn btn-outline" onClick={() => setShowPasswordModal(true)}>
            🔒 Change Password
          </button>
          <button className="btn btn-outline" onClick={signOut}>
            Logout
          </button>
        </div>
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
              {attendance?.working_minutes != null
                ? formatDuration(attendance.working_minutes)
                : liveElapsedMinutes != null
                ? `${formatDuration(liveElapsedMinutes)} (Active)`
                : '--'}
            </span>
          </div>
          <div className="att-field">
            <span className="att-label">Status:</span>
            <span className={`status-badge ${status === 'IN PROGRESS' ? 'status-halfday' : statusClass(status)}`}>
              {status === 'IN PROGRESS' ? '⏳ In Progress' : status || '--'}
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

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  )
}
