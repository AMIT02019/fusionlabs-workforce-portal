import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import {
  formatTime,
  formatDuration,
  dateKey,
} from '../lib/format'
import { TASK_STATUS_COLORS } from '../lib/status'
import { exportToCSV } from '../lib/export'

export default function WorkforceTaskOverviewTable({ currentUserId, today }) {
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.tasks.getWorkforceTable({ fromDate, toDate })
      setTasks(res.tasks || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate])

  useEffect(() => {
    loadTasks()
    const interval = setInterval(loadTasks, 10000)
    return () => clearInterval(interval)
  }, [loadTasks])

  function handleExportOverview() {
    const headers = [
      'Employee',
      'Date',
      'Project',
      'Task',
      'Check In',
      'Day Hours',
      'Week Hours',
      'Task Status',
    ]
    const rows = tasks.map((t) => [
      t.user_name || 'Team Member',
      t.task_date,
      t.project_name,
      t.task_name,
      t.check_in ? formatTime(t.check_in) : '--',
      t.day_minutes != null ? formatDuration(t.day_minutes) : '--',
      t.week_minutes != null ? formatDuration(t.week_minutes) : '--',
      t.status,
    ])
    exportToCSV(`Workforce_Overview_${fromDate}_to_${toDate}`, headers, rows)
  }

  return (
    <section className="card" style={{ marginTop: '20px' }}>
      <div className="section-head">
        <div>
          <h2 className="section-title">Team Work & Attendance Overview</h2>
          <p className="muted" style={{ fontSize: '13px', margin: '4px 0 0 0' }}>
            Live status of projects, tasks, check-in timestamps, and working hours
          </p>
        </div>
        <button
          className="btn btn-outline btn-sm"
          onClick={handleExportOverview}
          disabled={tasks.length === 0}
        >
          📥 Export CSV
        </button>
      </div>

      {/* Date Filter Bar: Date [ from ] to [ to ] */}
      <div className="filters-bar" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>Date</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            max={toDate}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
          <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 500 }}>to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            min={fromDate}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => {
            setFromDate(today)
            setToDate(today)
          }}
          style={{ fontSize: '12px', padding: '4px 10px' }}
        >
          Reset to Today
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p className="muted">Loading workforce overview…</p>
      ) : tasks.length === 0 ? (
        <p className="muted">No work records found for the selected date range.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Project</th>
                <th>Task</th>
                <th>Check In</th>
                <th>Day hr</th>
                <th>Week hr</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const isYou = task.user_id === currentUserId
                return (
                  <tr key={task.id}>
                    <td>
                      <strong>{task.user_name || 'Team Member'}</strong>
                      {isYou && <span className="muted small-text"> (You)</span>}
                    </td>
                    <td><strong>{task.project_name}</strong></td>
                    <td>
                      <div>{task.task_name}</div>
                      <span className={`task-badge ${TASK_STATUS_COLORS[task.status]}`} style={{ marginTop: '4px', display: 'inline-block', fontSize: '11px', padding: '2px 8px' }}>
                        {task.status === 'Completed'
                          ? '🟢 Completed'
                          : task.status === 'Half Done'
                          ? '🟡 Half Done'
                          : '🔴 Not Done'}
                      </span>
                    </td>
                    <td>{task.check_in ? formatTime(task.check_in) : '--'}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#2563eb' }}>
                        {task.day_minutes != null ? formatDuration(task.day_minutes) : '--'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#16a34a' }}>
                        {task.week_minutes != null ? formatDuration(task.week_minutes) : '--'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
