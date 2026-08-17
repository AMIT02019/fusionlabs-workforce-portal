import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import {
  formatLongDate,
  formatDay,
  formatTime,
  formatDuration,
  dateKey,
  attendanceStatus,
} from '../lib/format'
import { statusClass } from '../lib/status'
import { exportToCSV } from '../lib/export'
import SummaryCards from '../components/admin/SummaryCards'
import AttendanceCalendar from '../components/admin/AttendanceCalendar'
import EmployeeDetail from '../components/admin/EmployeeDetail'
import AllEmployeeWork from '../components/admin/AllEmployeeWork'

export default function AdminDashboard() {
  const { session, signOut } = useAuth()
  const today = dateKey(new Date())

  const [employees, setEmployees] = useState([])
  const [attendanceMap, setAttendanceMap] = useState({})
  const [todayAttendanceMap, setTodayAttendanceMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(today)
  const [search, setSearch] = useState('')
  const [empListSearch, setEmpListSearch] = useState('')
  const [viewEmployee, setViewEmployee] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Load employees list
      const empRes = await api.employees.list(today)
      const emps = empRes.employees || []
      setEmployees(emps)

      // Map today's attendance
      const tMap = {}
      emps.forEach((emp) => {
        if (emp.check_in || emp.today_status) {
          tMap[emp.id] = {
            check_in: emp.check_in,
            check_out: emp.check_out,
            working_minutes: emp.working_minutes,
            status: emp.today_status,
          }
        }
      })
      setTodayAttendanceMap(tMap)

      // 2. Load attendance for selected date
      if (selectedDate === today) {
        setAttendanceMap(tMap)
      } else {
        const attRes = await api.attendance.getAdminDate(selectedDate)
        const aMap = {}
        ;(attRes.records || []).forEach((r) => {
          if (r.check_in || r.status) {
            aMap[r.user_id] = r
          }
        })
        setAttendanceMap(aMap)
      }
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, today])

  useEffect(() => {
    load()
    // Poll every 10 seconds for real-time updates
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [load])

  // Summary calculations for today
  const todayDow = new Date(today + 'T00:00:00').getDay()
  const todayIsWeekend = todayDow === 0 || todayDow === 6

  let present = 0, halfday = 0, absent = 0, checkedIn = 0
  employees.forEach((emp) => {
    const att = todayAttendanceMap[emp.id]
    if (att) {
      const stat = att.status || attendanceStatus(att.working_minutes)
      if (stat === 'PRESENT') present++
      else if (stat === 'HALF DAY') halfday++
      else absent++
      if (att.check_in && !att.check_out) checkedIn++
    } else if (!todayIsWeekend) {
      absent++
    }
  })

  const summary = {
    total: employees.length,
    present,
    halfday,
    absent,
    checkedIn,
  }

  const selectedDow = new Date(selectedDate + 'T00:00:00').getDay()
  const isWeekend = selectedDow === 0 || selectedDow === 6

  // Filtered employees for the attendance table
  const filteredEmployees = employees.filter((emp) => {
    if (!search) return true
    return (
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase())
    )
  })

  // Filtered employees for the main employee list table
  const filteredEmployeeList = employees.filter((emp) => {
    if (!empListSearch) return true
    return (
      emp.name.toLowerCase().includes(empListSearch.toLowerCase()) ||
      emp.email.toLowerCase().includes(empListSearch.toLowerCase())
    )
  })

  // Export Attendance CSV
  function handleExportAttendance() {
    const headers = [
      'Employee Name',
      'Email',
      'Date',
      'Check In',
      'Check Out',
      'Working Hours',
      'Status',
    ]
    const rows = filteredEmployees.map((emp) => {
      const att = attendanceMap[emp.id]
      const status =
        att?.status ||
        attendanceStatus(att?.working_minutes) ||
        (isWeekend || selectedDate > today ? 'N/A' : 'ABSENT')
      return [
        emp.name,
        emp.email,
        selectedDate,
        att?.check_in ? formatTime(att.check_in) : '--',
        att?.check_out ? formatTime(att.check_out) : '--',
        att?.working_minutes != null ? formatDuration(att.working_minutes) : '--',
        status,
      ]
    })
    exportToCSV(`Attendance_Report_${selectedDate}`, headers, rows)
  }

  return (
    <div>
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-inner">
          <div>
            <div className="admin-brand-row">
              FusionLabs Digital
              <span className="live-indicator" title="Local SQLite Backend Active">
                <span className="live-dot" /> LIVE
              </span>
            </div>
            <div className="admin-sub-row">Admin Dashboard (Local Backend)</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="admin-welcome">Welcome, Sir</span>
            <button className="btn btn-outline" onClick={signOut}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="admin-body">
        {/* Summary cards */}
        <SummaryCards summary={summary} />

        {/* Today's Attendance */}
        <section className="card">
          <div className="section-head">
            <h2 className="section-title">
              {selectedDate === today
                ? "Today's Attendance"
                : `Attendance (${selectedDate})`}
            </h2>
            <button className="btn btn-outline btn-sm" onClick={handleExportAttendance}>
              📥 Export CSV
            </button>
          </div>

          <div className="filters-bar">
            <label className="field search-field">
              <span>Search Employee</span>
              <input
                type="text"
                placeholder="Type a name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Select Date</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={today}
              />
            </label>
          </div>

          {isWeekend && (
            <p className="muted" style={{ marginBottom: '12px' }}>
              {formatDay(new Date(selectedDate + 'T00:00:00'))} is a non-working day.
            </p>
          )}

          {loading ? (
            <p className="muted">Loading…</p>
          ) : filteredEmployees.length === 0 ? (
            <p className="muted">No employees found.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Working Hours</th>
                    <th>Status</th>
                    <th>View</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => {
                    const att = attendanceMap[emp.id]
                    const status =
                      att?.status ||
                      attendanceStatus(att?.working_minutes) ||
                      (isWeekend || selectedDate > today ? null : 'ABSENT')
                    return (
                      <tr key={emp.id}>
                        <td>
                          <strong>{emp.name}</strong>
                          <div className="muted small-text">{emp.email}</div>
                        </td>
                        <td>{att?.check_in ? formatTime(att.check_in) : '--'}</td>
                        <td>{att?.check_out ? formatTime(att.check_out) : '--'}</td>
                        <td>
                          {att?.working_minutes != null
                            ? formatDuration(att.working_minutes)
                            : '--'}
                        </td>
                        <td>
                          {status ? (
                            <span className={`status-badge ${statusClass(status)}`}>
                              {status === 'PRESENT'
                                ? '🟢 PRESENT'
                                : status === 'HALF DAY'
                                ? '🟡 HALF DAY'
                                : '🔴 ABSENT'}
                            </span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setViewEmployee(emp)}
                          >
                            View
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

        {/* Attendance Calendar */}
        <AttendanceCalendar employees={employees} />

        {/* Employees list */}
        <section className="card">
          <div className="section-head">
            <h2 className="section-title">
              Registered Employees ({employees.length})
            </h2>
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
            <p className="muted">Loading…</p>
          ) : filteredEmployeeList.length === 0 ? (
            <p className="muted">No employees match your search.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Joined</th>
                    <th>Today's Status</th>
                    <th>View Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployeeList.map((emp) => {
                    const att = todayAttendanceMap[emp.id]
                    const status =
                      att?.status ||
                      attendanceStatus(att?.working_minutes) ||
                      (todayIsWeekend ? null : 'ABSENT')
                    return (
                      <tr key={emp.id}>
                        <td><strong>{emp.name}</strong></td>
                        <td>{emp.email}</td>
                        <td>
                          {formatLongDate(new Date(emp.created_at)).replace(
                            /^[^,]+,\s*/,
                            ''
                          )}
                        </td>
                        <td>
                          {status ? (
                            <span className={`status-badge ${statusClass(status)}`}>
                              {status === 'PRESENT'
                                ? '🟢 PRESENT'
                                : status === 'HALF DAY'
                                ? '🟡 HALF DAY'
                                : '🔴 ABSENT'}
                            </span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setViewEmployee(emp)}
                          >
                            View
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

        {/* All Employee Work */}
        <AllEmployeeWork employees={employees} session={session} />
      </div>

      {/* Employee detail modal */}
      {viewEmployee && (
        <EmployeeDetail
          employee={viewEmployee}
          todayAttendance={todayAttendanceMap[viewEmployee.id]}
          session={session}
          onClose={() => {
            setViewEmployee(null)
            load()
          }}
        />
      )}
    </div>
  )
}
