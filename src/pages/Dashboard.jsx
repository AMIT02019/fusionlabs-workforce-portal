import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import {
  formatLongDate,
  formatTime,
  dateKey,
} from '../lib/format'
import WorkforceTaskOverviewTable from '../components/WorkforceTaskOverviewTable'
import TodayAttendanceList from '../components/TodayAttendanceList'
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
  const [refreshKey, setRefreshKey] = useState(0)

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

  async function handleCheckIn() {
    setActionLoading(true)
    setAttError('')
    setAttSuccessMsg('')
    try {
      const res = await api.attendance.checkIn(today)
      setAttendance(res.attendance)
      setAttSuccessMsg(`🟢 Checked in at ${formatTime(res.attendance.check_in)}`)
      await loadSummary()
      setRefreshKey((k) => k + 1)
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
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setAttError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Safe Exit: Navigates away safely without deleting records
  function handleExit() {
    navigate('/', { replace: true })
  }

  const checkedIn = !!attendance?.check_in
  const checkedOut = !!attendance?.check_out

  return (
    <div className="dashboard">
      {/* 1. TOP HEADER: Welcome (Left) | Check In / Check Out / Exit / Logout (Right) */}
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
            style={{ fontWeight: 700, padding: '8px 18px' }}
          >
            {checkedIn ? '✅ CHECKED IN' : 'CHECK IN'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCheckOut}
            disabled={!checkedIn || checkedOut || loadingAtt || actionLoading}
            style={{ fontWeight: 700, padding: '8px 18px' }}
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
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 18px',
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

      {/* 2. TOP TABLE: Date [from] to [to] | Employee | Project | Task | Check In | Day hr | Week hr */}
      <WorkforceTaskOverviewTable
        key={refreshKey}
        currentUserId={profile?.id}
        today={today}
      />

      {/* 3. TODAY'S ATTENDANCE SECTION: Employee | Status */}
      <TodayAttendanceList
        key={`att-${refreshKey}`}
        today={today}
        currentUserId={profile?.id}
      />

      {/* 4. INDV. TASKS (Individual / Today's Tasks Section) */}
      <TaskSection
        profile={profile}
        today={today}
        onTaskChange={() => {
          loadSummary()
          setRefreshKey((k) => k + 1)
        }}
      />

      {/* 5. WORK HISTORY SECTION */}
      <WorkHistory profile={profile} />

      {/* 6. MY ATTENDANCE SECTION WITH WEEKLY EXPORT */}
      <AttendanceHistory
        profile={profile}
        weekMinutes={weekMinutes}
        dayMinutes={dayMinutes}
      />

      {/* 7. BOTTOM: Admin Panel Link */}
      <div
        style={{
          marginTop: '32px',
          marginBottom: '20px',
          textAlign: 'center',
          padding: '20px',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ marginBottom: '10px', color: '#64748b', fontSize: '13px' }}>
          Are you an administrator?
        </div>
        <Link
          to="/admin-login"
          className="btn btn-outline"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
            fontSize: '14px',
            borderColor: '#64748b',
            color: '#334155',
          }}
        >
          🛡️ Admin Panel &rarr;
        </Link>
      </div>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  )
}
