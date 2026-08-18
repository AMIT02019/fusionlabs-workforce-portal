import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import {
  formatLongDate,
  formatTime,
  dateKey,
} from '../lib/format'
import WorkforceTaskOverviewTable from '../components/WorkforceTaskOverviewTable'
import TaskSection from '../components/TaskSection'
import TodayAttendanceList from '../components/TodayAttendanceList'
import WorkHistory from '../components/WorkHistory'
import AttendanceHistory from '../components/AttendanceHistory'
import ChangePasswordModal from '../components/ChangePasswordModal'

export default function Dashboard() {
  const { profile, signOut } = useAuth()
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

  const checkedIn = !!attendance?.check_in
  const checkedOut = !!attendance?.check_out

  return (
    <div className="dashboard" style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px' }}>
      {/* 1. TOP HEADER: Welcome, Name (Left) | Checkin / Checkout (Right) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
        <h1 className="dash-welcome" style={{ fontSize: '26px', fontWeight: 700, margin: 0 }}>
          Welcome, {profile?.name || 'Name'}
        </h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={handleCheckIn}
            disabled={checkedIn || loadingAtt || actionLoading}
            style={{ fontWeight: 600, padding: '8px 20px', borderRadius: '6px' }}
          >
            {checkedIn ? 'Checkin ✅' : 'Checkin'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCheckOut}
            disabled={!checkedIn || checkedOut || loadingAtt || actionLoading}
            style={{ fontWeight: 600, padding: '8px 20px', borderRadius: '6px' }}
          >
            {checkedOut ? 'Checkout 🏁' : 'Checkout'}
          </button>
        </div>
      </div>

      {/* 2. SUB-HEADER: Today's Date: */}
      <div style={{ fontSize: '15px', color: '#475569', fontWeight: 500, marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
        <strong>Today's Date:</strong> {formatLongDate(new Date())}
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

      {/* 3. TOP TABLE CARD: Day [ ] to Day [ ] | Emp Name | Project | Task | Checkin | Daily Hour | Weekly Hour */}
      <WorkforceTaskOverviewTable
        key={refreshKey}
        currentUserId={profile?.id}
        today={today}
      />

      {/* 4. TODAY'S TASK CARD: Today's Task | + Add Task */}
      <TaskSection
        profile={profile}
        today={today}
        onTaskChange={() => {
          loadSummary()
          setRefreshKey((k) => k + 1)
        }}
      />

      {/* 5. TODAY'S MY ATTENDANCE CARD: Employee | Status */}
      <TodayAttendanceList
        key={`att-${refreshKey}`}
        today={today}
        currentUserId={profile?.id}
      />

      {/* 6. WORK HISTORY & ATTENDANCE HISTORY */}
      <WorkHistory profile={profile} />

      <AttendanceHistory
        profile={profile}
        weekMinutes={weekMinutes}
        dayMinutes={dayMinutes}
      />

      {/* 7. BOTTOM CONTROLS: Logout / Change Pass (Right aligned as in wireframe) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px', flexWrap: 'wrap' }}>
        <button
          className="btn btn-outline"
          onClick={signOut}
          style={{ fontWeight: 600, padding: '8px 22px' }}
        >
          Logout
        </button>
        <button
          className="btn btn-outline"
          onClick={() => setShowPasswordModal(true)}
          style={{ fontWeight: 600, padding: '8px 22px' }}
        >
          Change Pass
        </button>
      </div>

      {/* Admin Switch Link */}
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <Link
          to="/admin-login"
          style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}
        >
          🛡️ Switch to Admin Portal &rarr;
        </Link>
      </div>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  )
}
