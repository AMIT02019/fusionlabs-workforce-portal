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
import MyTodayAttendance from '../components/MyTodayAttendance'
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
  const [refreshKey, setRefreshKey] = useState(0)

  const loadSummary = useCallback(async () => {
    if (!profile) return
    setLoadingAtt(true)
    try {
      const res = await api.attendance.getSummary(today)
      setAttendance(res.today || null)
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
    <div className="dashboard" style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 20px' }}>
      {/* 1. TOP HEADER: Welcome, Name (Left) | Checkin / Checkout (Right) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
        <h1 className="dash-welcome" style={{ fontSize: '26px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
          Welcome, {profile?.name || 'Name'}
        </h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={handleCheckIn}
            disabled={checkedIn || loadingAtt || actionLoading}
            style={{ fontWeight: 600, padding: '8px 22px', borderRadius: '6px' }}
          >
            {checkedIn ? 'Checkin ✅' : 'Checkin'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCheckOut}
            disabled={!checkedIn || checkedOut || loadingAtt || actionLoading}
            style={{ fontWeight: 600, padding: '8px 22px', borderRadius: '6px' }}
          >
            {checkedOut ? 'Checkout 🏁' : 'Checkout'}
          </button>
        </div>
      </div>

      {/* 2. SUB-HEADER: Today's Date: */}
      <div style={{ fontSize: '15px', color: '#334155', fontWeight: 600, marginBottom: '16px', paddingBottom: '12px', borderBottom: '1.5px solid #cbd5e1' }}>
        Today's Date: <span style={{ fontWeight: 400, color: '#64748b' }}>{formatLongDate(new Date())}</span>
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

      {/* 3. SECTION 1 (MAIN TABLE): Day [ ] to Day [ ] | Emp Name | Project | Task | Checkin | Daily Hour | Weekly Hour */}
      <WorkforceTaskOverviewTable
        key={refreshKey}
        currentUserId={profile?.id}
        today={today}
      />

      {/* 4. SECTION 2: Today's Task | + Add Task */}
      <TaskSection
        profile={profile}
        today={today}
        onTaskChange={() => {
          loadSummary()
          setRefreshKey((k) => k + 1)
        }}
      />

      {/* 5. SECTION 3: Today's My Attendance | Employee | Status */}
      <MyTodayAttendance
        profile={profile}
        attendance={attendance}
      />

      {/* 6. BOTTOM CONTROLS: Logout / Change Pass (Right aligned as in wireframe diagram) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px', flexWrap: 'wrap' }}>
        <button
          className="btn btn-outline"
          onClick={signOut}
          style={{ fontWeight: 600, padding: '8px 22px', borderRadius: '6px' }}
        >
          Logout
        </button>
        <button
          className="btn btn-outline"
          onClick={() => setShowPasswordModal(true)}
          style={{ fontWeight: 600, padding: '8px 22px', borderRadius: '6px' }}
        >
          Change Pass
        </button>
      </div>

      {/* Discreet Admin Switch Footer */}
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <Link
          to="/admin-login"
          style={{ color: '#94a3b8', fontSize: '12px', textDecoration: 'none' }}
        >
          🛡️ Admin Portal &rarr;
        </Link>
      </div>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  )
}
