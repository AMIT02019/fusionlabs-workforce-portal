import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import {
  formatShortDate,
  formatDay,
  formatTime,
  formatDuration,
  dateKey,
} from '../lib/format'
import { TASK_STATUS_COLORS } from '../lib/status'
import { exportToCSV } from '../lib/export'

export default function WorkHistory({ profile }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quickFilter, setQuickFilter] = useState('all') // 'today', 'yesterday', 'this_week', 'this_month', 'all'
  const [filterDate, setFilterDate] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const today = new Date()
  const todayStr = dateKey(today)

  // Compute dates for quick filters
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const yesterdayStr = dateKey(yesterday)

  // Monday of current week
  const dayOfWeek = today.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + diffToMonday)
  const mondayStr = dateKey(monday)

  // 1st of current month
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const firstOfMonthStr = dateKey(firstOfMonth)

  const loadTasks = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filterDate) {
        params.date = filterDate
      } else if (quickFilter === 'today') {
        params.date = todayStr
      } else if (quickFilter === 'yesterday') {
        params.date = yesterdayStr
      } else if (quickFilter === 'this_week') {
        params.fromDate = mondayStr
        params.toDate = todayStr
      } else if (quickFilter === 'this_month') {
        params.fromDate = firstOfMonthStr
        params.toDate = todayStr
      }

      if (filterProject.trim()) {
        params.project = filterProject.trim()
      }
      if (filterStatus && filterStatus !== 'all') {
        params.status = filterStatus
      }

      const res = await api.tasks.getMy(params)
      setTasks(res.tasks || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [profile, filterDate, quickFilter, filterProject, filterStatus, todayStr, yesterdayStr, mondayStr, firstOfMonthStr])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  function handleQuickFilter(type) {
    setQuickFilter(type)
    setFilterDate('') // Clear specific date when using quick filter
  }

  function handleExportMyTasks() {
    const headers = ['Date', 'Day', 'Project', 'Task', 'Start Time', 'End Time', 'Duration', 'Status']
    const rows = tasks.map((t) => [
      t.task_date,
      formatDay(t.task_date),
      t.project_name,
      t.task_name,
      t.start_time ? formatTime(t.start_time) : '--',
      t.end_time ? formatTime(t.end_time) : '--',
      t.duration_minutes != null ? formatDuration(t.duration_minutes) : '--',
      t.status,
    ])
    exportToCSV(`My_Work_History_${quickFilter}`, headers, rows)
  }

  return (
    <section className="card" style={{ marginTop: '24px' }}>
      <div className="section-head">
        <div>
          <h2 className="section-title">Work History</h2>
          <p className="muted" style={{ fontSize: '13px', margin: '4px 0 0 0' }}>
            Access and filter all your completed and active historical tasks
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleExportMyTasks} disabled={tasks.length === 0}>
          📥 Export CSV
        </button>
      </div>

      {/* Quick Filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <button
          className={`btn btn-sm ${quickFilter === 'today' && !filterDate ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleQuickFilter('today')}
        >
          Today
        </button>
        <button
          className={`btn btn-sm ${quickFilter === 'yesterday' && !filterDate ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleQuickFilter('yesterday')}
        >
          Yesterday
        </button>
        <button
          className={`btn btn-sm ${quickFilter === 'this_week' && !filterDate ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleQuickFilter('this_week')}
        >
          This Week
        </button>
        <button
          className={`btn btn-sm ${quickFilter === 'this_month' && !filterDate ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleQuickFilter('this_month')}
        >
          This Month
        </button>
        <button
          className={`btn btn-sm ${quickFilter === 'all' && !filterDate ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleQuickFilter('all')}
        >
          All
        </button>
      </div>

      {/* Detailed Filters Bar */}
      <div className="filters-bar" style={{ marginBottom: '16px' }}>
        <label className="field">
          <span>Filter Date</span>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => {
              setFilterDate(e.target.value)
              setQuickFilter('')
            }}
            max={todayStr}
          />
        </label>
        <label className="field">
          <span>Project</span>
          <input
            type="text"
            placeholder="Search project..."
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Status</span>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Half Done">Half Done</option>
            <option value="Not Done">Not Done</option>
          </select>
        </label>
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p className="muted">Loading work history…</p>
      ) : tasks.length === 0 ? (
        <p className="muted">No tasks found for the selected filters.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Project</th>
                <th>Task</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td><strong>{formatShortDate(task.task_date)}</strong></td>
                  <td>{formatDay(task.task_date)}</td>
                  <td><strong>{task.project_name}</strong></td>
                  <td>{task.task_name}</td>
                  <td>{formatTime(task.start_time) || '--'}</td>
                  <td>{formatTime(task.end_time) || '--'}</td>
                  <td>{task.duration_minutes != null ? formatDuration(task.duration_minutes) : '--'}</td>
                  <td>
                    <span className={`task-badge ${TASK_STATUS_COLORS[task.status]}`}>
                      {task.status === 'Completed'
                        ? '🟢 Completed'
                        : task.status === 'Half Done'
                        ? '🟡 Half Done'
                        : '🔴 Not Done'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
