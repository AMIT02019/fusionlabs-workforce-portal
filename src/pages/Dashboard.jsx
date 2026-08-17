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
  const [attSuccessMsg, setAttSuccessMsg] = useState('')
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
    setAttSuccessMsg('')
    try {
      const res = await api.attendance.checkIn(today)
      setAttendance(res.attendance)
      setAttSuccessMsg('🟢 Checked In successfully! Your attendance is recorded. You can add your tasks below or exit.')
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
      setAttSuccessMsg('🏁 Checked Out successfully! Workday complete. You can now safely exit the portal.')
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
          <button
            className="btn btn-outline"
            onClick={signOut}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            title="Exit and Logout"
          >
            🚪 Exit / Logout
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
            className="btn btn-outline btn-sm"
            onClick={signOut}
            style={{ marginLeft: '16px', whiteSpace: 'nowrap', borderColor: '#16a34a', color: '#166534', background: '#ffffff' }}
          >
            🚪 Exit / Logout Now
          </button>
        </div>
      )}

      {/* Attendance Card */}
      <section className="card">
        <div className="section-head">
          <h2 className="section-title">Today's Attendance</h2>
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

        <div className="att-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={handleCheckIn}
            disabled={checkedIn || loadingAtt || actionLoading}
          >
            {checkedIn ? (attendance?.check_in ? `Checked in at ${formatTime(attendance.check_in)}` : 'Checked In') : 'CHECK IN'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCheckOut}
            disabled={!checkedIn || checkedOut || loadingAtt || actionLoading}
          >
            {checkedOut ? (attendance?.check_out ? `Checked out at ${formatTime(attendance.check_out)}` : 'Checked Out') : 'CHECK OUT'}
          </button>

          {/* Quick Exit / Close Button right next to Check in/out */}
          <button
            className="btn btn-outline"
            onClick={signOut}
            title="Exit workforce portal and return to login"
            style={{ marginLeft: 'auto' }}
          >
            🚪 Exit / Close Session
          </button>
        </div>
      </section>

      {/* Task Section */}
      <TaskSection profile={profile} today={today} onExit={signOut} />

      {/* Attendance History */}
      <AttendanceHistory profile={profile} />

      {/* Session Finish & Exit Section at bottom */}
      <div
        style={{
          marginTop: '24px',
          padding: '16px 20px',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>Finished for now?</div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            All your attendance timestamps and task updates are automatically saved.
          </div>
        </div>
        <button
          className="btn btn-outline"
          onClick={signOut}
          style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          🚪 Exit & Logout
        </button>
      </div>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  )
}
