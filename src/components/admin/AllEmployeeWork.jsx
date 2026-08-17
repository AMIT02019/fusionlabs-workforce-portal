import { useState, useEffect, useCallback } from 'react'
import { api } from '../../lib/api'
import {
  formatShortDate,
  formatTime,
  formatDuration,
  dateKey,
  minutesBetween,
} from '../../lib/format'
import { TASK_STATUS_COLORS } from '../../lib/status'
import { exportToCSV } from '../../lib/export'

export default function AllEmployeeWork({ employees }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [empFilter, setEmpFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (empFilter !== 'all') params.userId = empFilter
      if (dateFilter) params.date = dateFilter
      if (statusFilter !== 'all') params.status = statusFilter

      const res = await api.tasks.getAll(params)
      setTasks(res.tasks || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [empFilter, dateFilter, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  // Client-side filtering for search and project (text-based)
  const filtered = tasks.filter((task) => {
    const empName = task.user_name || ''
    if (search && !empName.toLowerCase().includes(search.toLowerCase())) return false
    if (projectFilter && !task.project_name.toLowerCase().includes(projectFilter.toLowerCase())) return false
    return true
  })

  // Export tasks to CSV
  function handleExportTasks() {
    const headers = ['Employee', 'Date', 'Project Name', 'Task Name', 'Start Time', 'End Time', 'Duration', 'Status']
    const rows = filtered.map((task) => [
      task.user_name || 'Unknown',
      task.task_date,
      task.project_name,
      task.task_name,
      task.start_time ? formatTime(task.start_time) : '--',
      task.end_time ? formatTime(task.end_time) : '--',
      task.duration_minutes != null ? formatDuration(task.duration_minutes) : '--',
      task.status,
    ])
    exportToCSV(`Work_Tasks_Report_${dateKey(new Date())}`, headers, rows)
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setError('')

    try {
      await api.tasks.update(editing.id, {
        project_name: editing.project_name.trim(),
        task_name: editing.task_name.trim(),
        status: editing.status,
        start_time: editing.start_time,
        end_time: editing.end_time || null,
      })
      setEditing(null)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return
    try {
      await api.tasks.delete(taskId)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  function startEdit(task) {
    setEditing({
      id: task.id,
      project_name: task.project_name,
      task_name: task.task_name,
      status: task.status,
      start_time: task.start_time,
      end_time: task.end_time || '',
    })
  }

  return (
    <section className="card">
      <div className="section-head">
        <h2 className="section-title">All Employee Work ({filtered.length})</h2>
        <button className="btn btn-outline btn-sm" onClick={handleExportTasks}>
          📥 Export CSV
        </button>
      </div>

      {error && <p className="form-error" style={{ marginBottom: '16px' }}>{error}</p>}

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
          <span>Employee</span>
          <select value={empFilter} onChange={(e) => setEmpFilter(e.target.value)}>
            <option value="all">All Employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Date</span>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        </label>
        <label className="field">
          <span>Project</span>
          <input
            type="text"
            placeholder="Project name..."
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Status</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option>Completed</option>
            <option>Half Done</option>
            <option>Not Done</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="muted">No tasks found.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Project</th>
                <th>Task</th>
                <th>Start</th>
                <th>End</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => {
                if (editing && editing.id === task.id) {
                  return (
                    <tr key={task.id}>
                      <td>{task.user_name || '—'}</td>
                      <td>{formatShortDate(task.task_date)}</td>
                      <td>
                        <input type="text" value={editing.project_name}
                          onChange={(e) => setEditing({ ...editing, project_name: e.target.value })} />
                      </td>
                      <td>
                        <input type="text" value={editing.task_name}
                          onChange={(e) => setEditing({ ...editing, task_name: e.target.value })} />
                      </td>
                      <td>
                        <input type="text" value={editing.start_time}
                          onChange={(e) => setEditing({ ...editing, start_time: e.target.value })} />
                      </td>
                      <td>
                        <input type="text" value={editing.end_time}
                          onChange={(e) => setEditing({ ...editing, end_time: e.target.value })} />
                      </td>
                      <td>{formatDuration(task.duration_minutes) || '--'}</td>
                      <td>
                        <select value={editing.status}
                          onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                          <option>Not Done</option>
                          <option>Half Done</option>
                          <option>Completed</option>
                        </select>
                      </td>
                      <td className="actions-cell">
                        <button className="btn btn-primary btn-sm" onClick={handleSaveEdit}>Save</button>
                        <button className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                      </td>
                    </tr>
                  )
                }
                return (
                  <tr key={task.id}>
                    <td>{task.user_name || '—'}</td>
                    <td>{formatShortDate(task.task_date)}</td>
                    <td>{task.project_name}</td>
                    <td>{task.task_name}</td>
                    <td>{formatTime(task.start_time)}</td>
                    <td>{formatTime(task.end_time) || '--'}</td>
                    <td>{formatDuration(task.duration_minutes) || '--'}</td>
                    <td>
                      <span className={`task-badge ${TASK_STATUS_COLORS[task.status]}`}>
                        {task.status === 'Completed'
                          ? '🟢 Completed'
                          : task.status === 'Half Done'
                          ? '🟡 Half Done'
                          : '🔴 Not Done'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button className="btn btn-outline btn-sm" onClick={() => startEdit(task)}>Edit</button>
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
