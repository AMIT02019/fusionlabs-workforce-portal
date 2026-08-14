import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import {
  formatLongDate,
  formatDay,
  formatTime,
  formatDuration,
  dateKey,
  attendanceStatus,
} from '../lib/format'
import { statusClass } from '../lib/status'
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
  const [viewEmployee, setViewEmployee] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: emps } = await supabase
      .from('profiles')
      .select('id, name, email, role, created_at')
      .neq('role', 'admin')
      .order('name', { ascending: true })

    setEmployees(emps || [])

    const { data: atts } = await supabase
      .from('attendance')
      .select('user_id, check_in, check_out, working_minutes, status')
      .eq('attendance_date', selectedDate)

    const map = {}
    ;(atts || []).forEach((a) => { map[a.user_id] = a })
    setAttendanceMap(map)

    if (selectedDate === today) {
      setTodayAttendanceMap(map)
    } else {
      const { data: todayAtts } = await supabase
        .from('attendance')
        .select('user_id, check_in, check_out, working_minutes, status')
        .eq('attendance_date', today)
      const tMap = {}
      ;(todayAtts || []).forEach((a) => { tMap[a.user_id] = a })
      setTodayAttendanceMap(tMap)
    }

    setLoading(false)
  }, [selectedDate, today])

  useEffect(() => {
    load()
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
    return emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div>
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-inner">
          <div>
            <div className="admin-brand-row">FusionLabs Digital</div>
            <div className="admin-sub-row">Admin Dashboard</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="admin-welcome">Welcome, Sir</span>
            <button className="btn btn-outline" onClick={signOut}>Logout</button>
          </div>
        </div>
      </header>

      <div className="admin-body">
        {/* Summary cards — always reflect today */}
        <SummaryCards summary={summary} />

        {/* Today's Attendance */}
        <section className="card">
          <div className="section-head">
            <h2 className="section-title">Today's Attendance</h2>
          </div>

          <div className="filters-bar">
            <label className="field search-field">
              <span>Search Employee</span>
              <input
                type="text"
                placeholder="Type a name..."
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
                    const status = att?.status || attendanceStatus(att?.working_minutes) || (isWeekend || selectedDate > today ? null : 'ABSENT')
                    return (
                      <tr key={emp.id}>
                        <td>{emp.name}</td>
                        <td>{att?.check_in ? formatTime(att.check_in) : '--'}</td>
                        <td>{att?.check_out ? formatTime(att.check_out) : '--'}</td>
                        <td>{att?.working_minutes != null ? formatDuration(att.working_minutes) : '--'}</td>
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
                          <button className="btn btn-outline btn-sm" onClick={() => setViewEmployee(emp)}>
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
          <h2 className="section-title">Employees</h2>

          {loading ? (
            <p className="muted">Loading…</p>
          ) : employees.length === 0 ? (
            <p className="muted">No employees registered yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Joined</th>
                    <th>Today's Status</th>
                    <th>View</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const att = todayMap[emp.id]
                    const status = att?.status || attendanceStatus(att?.working_minutes) || (todayIsWeekend ? null : 'ABSENT')
                    return (
                      <tr key={emp.id}>
                        <td>{emp.name}</td>
                        <td>{emp.email}</td>
                        <td>{formatLongDate(new Date(emp.created_at)).replace(/^[^,]+,\s*/, '')}</td>
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
                          <button className="btn btn-outline btn-sm" onClick={() => setViewEmployee(emp)}>
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
          todayAttendance={todayMap[viewEmployee.id]}
          session={session}
          onClose={() => setViewEmployee(null)}
        />
      )}
    </div>
  )
}
