import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import {
  formatShortDate,
  dateKey,
  attendanceStatus,
} from '../lib/format'
import { statusClass } from '../lib/status'
import SummaryCards from '../components/admin/SummaryCards'
import WorkforceSummary from '../components/admin/WorkforceSummary'
import AllEmployeeWork from '../components/admin/AllEmployeeWork'
import AttendanceHistoryAdmin from '../components/admin/AttendanceHistoryAdmin'
import EmployeeDetail from '../components/admin/EmployeeDetail'
import DeleteEmployeeModal from '../components/admin/DeleteEmployeeModal'
import AdminSettingsModal from '../components/admin/AdminSettingsModal'

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const today = dateKey(new Date())

  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [empListSearch, setEmpListSearch] = useState('')
  const [viewEmployee, setViewEmployee] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showAdminSettings, setShowAdminSettings] = useState(false)
  const [notification, setNotification] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const empRes = await api.employees.list(today)
      setEmployees(empRes.employees || [])
    } catch (err) {
      console.error('Failed to load admin employees:', err)
    } finally {
      setLoading(false)
    }
  }, [today])

  useEffect(() => {
    load()
    // Poll every 10 seconds for real-time updates
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [load])

  function handleEmployeeDeleted(emp) {
    setNotification(`Employee "${emp.name}" was successfully removed.`)
    setTimeout(() => setNotification(''), 4000)
    load()
  }

  function handleAdminUpdated(adminUser) {
    setNotification(`Administrator credentials updated. Log in ID is now: ${adminUser.email}`)
    setTimeout(() => setNotification(''), 5000)
  }

  // Summary calculations for today
  const todayDow = new Date(today + 'T00:00:00').getDay()
  const todayIsWeekend = todayDow === 0 || todayDow === 6

  let present = 0, halfday = 0, absent = 0, checkedIn = 0
  employees.forEach((emp) => {
    const stat = emp.today_status || attendanceStatus(emp.working_minutes)
    if (stat === 'PRESENT') present++
    else if (stat === 'HALF DAY') halfday++
    else if (!todayIsWeekend) absent++

    if (emp.check_in && !emp.check_out) checkedIn++
  })

  const summary = {
    total: employees.length,
    present,
    halfday,
    absent,
    checkedIn,
  }

  // Filtered employees for directory list
  const filteredEmployeeList = employees.filter((emp) => {
    if (!empListSearch) return true
    return (
      emp.name.toLowerCase().includes(empListSearch.toLowerCase()) ||
      emp.email.toLowerCase().includes(empListSearch.toLowerCase())
    )
  })

  return (
    <div>
      {/* Admin Header */}
      <header className="admin-header">
        <div className="admin-header-inner">
          <div>
            <div className="admin-brand-row">
              FusionLabs Digital
              <span className="live-indicator" title="Cloud Database Active">
                <span className="live-dot" /> LIVE
              </span>
            </div>
            <div className="admin-sub-row">Admin Dashboard & Workforce Management</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="admin-welcome">Welcome, {profile?.name || 'Administrator'}</span>
            <button
              className="btn btn-outline"
              onClick={() => setShowAdminSettings(true)}
              title="Change Admin ID & Password"
            >
              ⚙️ Admin Settings
            </button>
            <button className="btn btn-outline" onClick={signOut}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="admin-body">
        {notification && (
          <div className="success-msg" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>✅ {notification}</span>
            <button onClick={() => setNotification('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>&times;</button>
          </div>
        )}

        {/* 1. Summary Cards */}
        <SummaryCards summary={summary} />

        {/* 2. All Workforce Summary Table */}
        <WorkforceSummary employees={employees} today={today} />

        {/* 3. Work History Section (All Employees' Historical Tasks) */}
        <AllEmployeeWork employees={employees} today={today} />

        {/* 4. Attendance History Section */}
        <AttendanceHistoryAdmin employees={employees} today={today} />

        {/* 5. Employee Directory Section */}
        <section className="card" style={{ marginTop: '24px' }}>
          <div className="section-head">
            <div>
              <h2 className="section-title">Employee Directory ({employees.length})</h2>
              <p className="muted" style={{ fontSize: '13px', margin: '4px 0 0 0' }}>
                All registered team members and organizational profiles
              </p>
            </div>
          </div>

          <div className="filters-bar" style={{ marginBottom: '16px' }}>
            <label className="field search-field">
              <span>Search Directory</span>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={empListSearch}
                onChange={(e) => setEmpListSearch(e.target.value)}
              />
            </label>
          </div>

          {loading ? (
            <p className="muted">Loading employee directory…</p>
          ) : filteredEmployeeList.length === 0 ? (
            <p className="muted">No employees found.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Work Email</th>
                    <th>Joined Date</th>
                    <th>Today's Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployeeList.map((emp) => {
                    const status = emp.today_status || (emp.check_in ? (emp.check_out ? attendanceStatus(emp.working_minutes) : 'IN PROGRESS') : 'ABSENT')
                    return (
                      <tr key={emp.id}>
                        <td><strong>{emp.name}</strong></td>
                        <td>{emp.email}</td>
                        <td>{emp.created_at ? formatShortDate(emp.created_at) : '--'}</td>
                        <td>
                          <span className={`status-badge ${status === 'IN PROGRESS' ? 'status-halfday' : statusClass(status)}`}>
                            {status === 'PRESENT'
                              ? '🟢 PRESENT'
                              : status === 'HALF DAY'
                              ? '🟡 HALF DAY'
                              : status === 'IN PROGRESS'
                              ? '⏳ In Progress'
                              : '🔴 ABSENT'}
                          </span>
                        </td>
                        <td className="actions-cell">
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setViewEmployee(emp)}
                          >
                            View Details
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setDeleteTarget(emp)}
                            title="Permanently remove employee"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Employee Detail Modal */}
      {viewEmployee && (
        <EmployeeDetail
          employee={viewEmployee}
          todayAttendance={viewEmployee}
          onClose={() => setViewEmployee(null)}
          onDeleted={handleEmployeeDeleted}
        />
      )}

      {/* Delete Employee Confirmation Modal */}
      {deleteTarget && (
        <DeleteEmployeeModal
          employee={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleEmployeeDeleted}
        />
      )}

      {/* Admin Settings Modal */}
      {showAdminSettings && (
        <AdminSettingsModal
          onClose={() => setShowAdminSettings(false)}
          onSuccess={handleAdminUpdated}
        />
      )}
    </div>
  )
}
