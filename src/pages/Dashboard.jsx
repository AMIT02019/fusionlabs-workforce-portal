import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
import WorkHistory from '../components/WorkHistory'
import AttendanceHistory from '../components/AttendanceHistory'
import ChangePasswordModal from '../components/ChangePasswordModal'

export default function Dashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const today = dateKey(new Date())

  const [attendance, setAttendance] = useState(null)
  const [dayMinutes, setDayMinutes] = useState(0)
  const [weekMinutes, setWeekMinutes] = useState(0)
  const [loadingAtt, setLoadingAtt] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [attError, setAttError] = useState('')
  const [attSuccessMsg, setAttSuccessMsg] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [liveElapsedMinutes, setLiveElapsedMinutes] = useState(null)

  const loadSummary = useCallback(async () => {
    if (!profile) return
    setLoadingAtt(true)
    try {
      const res = await api.attendance.getSummary(today)
      setAttendance(res.today || null)
      setDayMinutes(res.dayMinutes || 0)
      setWeekMinutes(res.weekMinutes || 0)
    } catch (err) {
      setAttError(err.message)
    } finally {
      setLoadingAtt(false)
    }
  }, [profile, today])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

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
    setAttSuccessMsg('')
    try {
      const res = await api.attendance.checkIn(today)
      setAttendance(res.attendance)
      setAttSuccessMsg(`🟢 Checked in at ${formatTime(res.attendance.check_in)}`)
      await loadSummary()
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
    setAttSuccessMsg('')
    try {
      const res = await api.attendance.checkOut(today)
      setAttendance(res.attendance)
      setAttSuccessMsg(`🏁 Checked out at ${formatTime(res.attendance.check_out)}. Workday completed!`)
      await loadSummary()
    } catch (err) {
      setAttError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Safe Exit: Navigates away to landing/home without deleting data or logging out
  function handleExit() {
    navigate('/', { replace: true })
  }

  const checkedIn = !!attendance?.check_in
  const checkedOut = !!attendance?.check_out
  const status = attendance?.status || (checkedIn && !checkedOut ? 'IN PROGRESS' : 'ABSENT')

  const displayDayHours =
    attendance?.working_minutes != null
      ? formatDuration(attendance.working_minutes)
      : liveElapsedMinutes != null
      ? `${formatDuration(liveElapsedMinutes)} (active)`
      : dayMinutes > 0
      ? formatDuration(dayMinutes)
      : '0h'

  const displayWeekHours =
    weekMinutes > 0 ? formatDuration(weekMinutes) : '0h'

  return (
    <div className="dashboard">
      {/* 3. DASHBOARD HEADER */}
      <div className="dash-top">
        <div>
          <h1 className="dash-welcome">Welcome, {profile?.name || 'Employee'}</h1>
          <p className="dash-date">Today's Date: {formatLongDate(new Date())}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={handleCheckIn}
            disabled={checkedIn || loadingAtt || actionLoading}
            style={{ fontWeight: 600 }}
          >
            {checkedIn ? '✅ CHECKED IN' : 'CHECK IN'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCheckOut}
            disabled={!checkedIn || checkedOut || loadingAtt || actionLoading}
            style={{ fontWeight: 600 }}
          >
            {checkedOut ? '🏁 CHECKED OUT' : 'CHECK OUT'}
          </button>
          <button
            className="btn btn-outline"
            onClick={handleExit}
            title="Safely exit to home page"
            style={{ fontWeight: 600 }}
          >
            EXIT
          </button>
          <button
            className="btn btn-outline"
            onClick={signOut}
            title="Log out and end session"
            style={{ fontWeight: 600 }}
          >
            LOGOUT
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setShowPasswordModal(true)}
            title="Change Password"
          >
            🔒 Password
          </button>
        </div>
      </div>

      {attSuccessMsg && (
        <div
          className="success-msg"
          style={{
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
            borderRadius: '8px',
          }}
        >
          <div>{attSuccessMsg}</div>
          <button
            onClick={() => setAttSuccessMsg('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', marginLeft: '12px' }}
          >
            &times;
          </button>
        </div>
      )}

      {attError && <p className="form-error" style={{ marginBottom: '16px' }}>{attError}</p>}

      {/* Attendance & Hours Overview Card */}
      <section className="card">
        <div className="section-head">
          <h2 className="section-title">Today's Attendance & Working Hours</h2>
          {checkedOut && (
            <span className="status-badge status-present">
              ✅ Workday Finished
            </span>
          )}
        </div>

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
            <span className="att-label">Day Hours:</span>
            <span className="att-value" style={{ color: '#2563eb', fontWeight: 700 }}>
              {displayDayHours}
            </span>
          </div>
          <div className="att-field">
            <span className="att-label">Week Hours (Mon-Sun):</span>
            <span className="att-value" style={{ color: '#16a34a', fontWeight: 700 }}>
              {displayWeekHours}
            </span>
          </div>
          <div className="att-field">
            <span className="att-label">Attendance Status:</span>
            <span className={`status-badge ${status === 'IN PROGRESS' ? 'status-halfday' : statusClass(status)}`}>
              {status === 'IN PROGRESS' ? '⏳ In Progress' : status || '--'}
            </span>
          </div>
        </div>
      </section>

      {/* 7. TODAY'S TASK SECTION */}
      <TaskSection profile={profile} today={today} onTaskChange={loadSummary} />

      {/* 14. WORK HISTORY SECTION */}
      <WorkHistory profile={profile} />

      {/* 15. MY ATTENDANCE SECTION */}
      <AttendanceHistory profile={profile} weekMinutes={weekMinutes} dayMinutes={dayMinutes} />

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  )
}
