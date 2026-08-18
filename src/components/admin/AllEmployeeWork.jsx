import { useState, useEffect, useCallback } from 'react'
import { api } from '../../lib/api'
import {
  formatShortDate,
  formatDay,
  formatTime,
  formatDuration,
  dateKey,
} from '../../lib/format'
import { TASK_STATUS_COLORS } from '../../lib/status'
import { exportToCSV } from '../../lib/export'

export default function AllEmployeeWork({ employees, today }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [editingTask, setEditingTask] = useState(null)

  // Quick filters
  const [quickFilter, setQuickFilter] = useState('today') // 'today', 'yesterday', 'this_week', 'this_month', 'all'
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const todayDate = new Date()
  const todayStr = dateKey(todayDate)

  const yesterday = new Date(todayDate)
  yesterday.setDate(todayDate.getDate() - 1)
  const yesterdayStr = dateKey(yesterday)

  const dayOfWeek = todayDate.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(todayDate)
  monday.setDate(todayDate.getDate() + diffToMonday)
  const mondayStr = dateKey(monday)

  const firstOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  const firstOfMonthStr = dateKey(firstOfMonth)

  const loadTasks = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true)
    setError('')
    try {
      const params = {}
      if (selectedUser && selectedUser !== 'all') {
        params.userId = selectedUser
      }

      if (fromDate || toDate) {
        if (fromDate) params.fromDate = fromDate
        if (toDate) params.toDate = toDate
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
      if (search.trim()) {
        params.search = search.trim()
      }

      const res = await api.tasks.getAll(params)
      setTasks(res.tasks || [])
    } catch (err) {
      if (!isBackground) setError(err.message)
    } finally {
      if (!isBackground) setLoading(false)
    }
  }, [selectedUser, fromDate, toDate, quickFilter, filterProject, filterStatus, search, todayStr, yesterdayStr, mondayStr, firstOfMonthStr])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  function handleQuickFilter(type) {
    setQuickFilter(type)
    setFromDate('')
    setToDate('')
  }

  async function handleStatusChange(task, newStatus) {
    setError('')
    try {
      await api.tasks.update(task.id, { status: newStatus })
      setMsg(`✅ Task marked as "${newStatus}"!`)
      setTimeout(() => setMsg(''), 4000)
      await loadTasks()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setError('')
    try {
      await api.tasks.update(editingTask.id, {
        project_name: editingTask.project_name.trim(),
        task_name: editingTask.task_name.trim(),
        status: editingTask.status,
      })
      setEditingTask(null)
      setMsg('✅ Task updated successfully!')
      setTimeout(() => setMsg(''), 4000)
      await loadTasks()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return
    try {
      await api.tasks.delete(taskId)
      setMsg('🗑️ Task permanently removed.')
      setTimeout(() => setMsg(''), 4000)
      await loadTasks()
    } catch (err) {
      setError(err.message)
    }
  }

  function handleExportTasks() {
    const headers = [
      'Date',
      'Day',
      'Employee',
      'Email',
      'Project',
      'Task',
      'Start Time',
      'End Time',
      'Duration',
      'Status',
    ]
    const rows = tasks.map((t) => [
      t.task_date,
      formatDay(t.task_date),
      t.user_name || 'Employee',
      t.user_email || '',
      t.project_name,
      t.task_name,
      t.start_time ? formatTime(t.start_time) : '--',
      t.end_time ? formatTime(t.end_time) : '--',
      t.duration_minutes != null ? formatDuration(t.duration_minutes) : '--',
      t.status,
    ])
    exportToCSV(`Work_History_${quickFilter || 'filtered'}`, headers, rows)
  }

  return (
    <section className="card" style={{ marginTop: '24px' }}>
      <div className="section-head">
        <div>
          <h2 className="section-title">Work History ({tasks.length})</h2>
          <p className="muted" style={{ fontSize: '13px', margin: '4px 0 0 0' }}>
            Historical work assignments across all team members and projects
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleExportTasks} disabled={tasks.length === 0}>
          📥 Export CSV
        </button>
      </div>

      {msg && (
        <div className="success-msg" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{msg}</span>
          <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>&times;</button>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      {/* Quick Filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <button
          className={`btn btn-sm ${quickFilter === 'today' && !fromDate ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleQuickFilter('today')}
        >
          Today
        </button>
        <button
          className={`btn btn-sm ${quickFilter === 'yesterday' && !fromDate ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleQuickFilter('yesterday')}
        >
          Yesterday
        </button>
        <button
          className={`btn btn-sm ${quickFilter === 'this_week' && !fromDate ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleQuickFilter('this_week')}
        >
          This Week
        </button>
        <button
          className={`btn btn-sm ${quickFilter === 'this_month' && !fromDate ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleQuickFilter('this_month')}
        >
          This Month
        </button>
        <button
          className={`btn btn-sm ${quickFilter === 'all' && !fromDate ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleQuickFilter('all')}
        >
          All
        </button>
      </div>

      {/* Detailed Filters Bar */}
      <div className="filters-bar" style={{ marginBottom: '16px' }}>
        <label className="field search-field">
          <span>Search Employee / Task</span>
          <input
            type="text"
            placeholder="Type name, email, task..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Employee</span>
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
            <option value="all">All Employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>From Date</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value)
              setQuickFilter('')
            }}
          />
        </label>
        <label className="field">
          <span>To Date</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value)
              setQuickFilter('')
            }}
            max={todayStr}
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

      {loading ? (
        <p className="muted">Loading work history…</p>
      ) : tasks.length === 0 ? (
        <p className="muted">No work records found matching the active filters.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Employee</th>
                <th>Project</th>
                <th>Task</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                if (editingTask && editingTask.id === task.id) {
                  return (
                    <tr key={task.id}>
                      <td>{formatShortDate(task.task_date)}</td>
                      <td>{formatDay(task.task_date)}</td>
                      <td><strong>{task.user_name}</strong></td>
                      <td>
                        <input
                          type="text"
                          value={editingTask.project_name}
                          onChange={(e) => setEditingTask({ ...editingTask, project_name: e.target.value })}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editingTask.task_name}
                          onChange={(e) => setEditingTask({ ...editingTask, task_name: e.target.value })}
                          required
                        />
                      </td>
                      <td>{formatTime(task.start_time)}</td>
                      <td>{formatTime(task.end_time) || '--'}</td>
                      <td>{formatDuration(task.duration_minutes) || '--'}</td>
                      <td>
                        <select
                          value={editingTask.status}
                          onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                        >
                          <option value="Not Done">🔴 Not Done</option>
                          <option value="Half Done">🟡 Half Done</option>
                          <option value="Completed">🟢 Completed</option>
                        </select>
                      </td>
                      <td className="actions-cell">
                        <button className="btn btn-primary btn-sm" onClick={handleSaveEdit}>Save</button>
                        <button className="btn btn-outline btn-sm" onClick={() => setEditingTask(null)}>Cancel</button>
                      </td>
                    </tr>
                  )
                }
                return (
                  <tr key={task.id}>
                    <td><strong>{formatShortDate(task.task_date)}</strong></td>
                    <td>{formatDay(task.task_date)}</td>
                    <td>
                      <strong>{task.user_name || 'Team Member'}</strong>
                      {task.user_email && <div className="muted small-text">{task.user_email}</div>}
                    </td>
                    <td><strong>{task.project_name}</strong></td>
                    <td>{task.task_name}</td>
                    <td>{formatTime(task.start_time)}</td>
                    <td>{formatTime(task.end_time) || '--'}</td>
                    <td>{task.duration_minutes != null ? formatDuration(task.duration_minutes) : '--'}</td>
                    <td>
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task, e.target.value)}
                        className={`task-select ${TASK_STATUS_COLORS[task.status]}`}
                      >
                        <option value="Not Done">🔴 Not Done</option>
                        <option value="Half Done">🟡 Half Done</option>
                        <option value="Completed">🟢 Completed</option>
                      </select>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setEditingTask({
                          id: task.id,
                          project_name: task.project_name,
                          task_name: task.task_name,
                          status: task.status,
                        })}
                      >
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(task.id)}>Delete</button>
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
