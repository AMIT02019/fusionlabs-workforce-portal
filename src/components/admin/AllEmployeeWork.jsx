import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import {
  formatShortDate,
  formatDay,
  formatTime,
  formatDuration,
  dateKey,
  minutesBetween,
} from '../../lib/format'
import { TASK_STATUS_COLORS } from '../../lib/status'

export default function AllEmployeeWork({ employees, session }) {
  const [tasks, setTasks] = useState([])
  const [profiles, setProfiles] = useState({})
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
    let query = supabase
      .from('tasks')
      .select('id, user_id, project_name, task_name, task_date, start_time, end_time, duration_minutes, status')
      .order('task_date', { ascending: false })
      .order('start_time', { ascending: false })

    if (empFilter !== 'all') query = query.eq('user_id', empFilter)
    if (dateFilter) query = query.eq('task_date', dateFilter)
    if (statusFilter !== 'all') query = query.eq('status', statusFilter)

    const { data, error: tErr } = await query
    if (tErr) {
      setError(tErr.message)
      setLoading(false)
      return
    }

    // Fetch profile names
    const userIds = [...new Set((data || []).map((t) => t.user_id))]
    if (userIds.length) {
      const { data: profData } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds)
      const map = {}
      ;(profData || []).forEach((p) => { map[p.id] = p.name })
      setProfiles(map)
    }

    setTasks(data || [])
    setLoading(false)
  }, [empFilter, dateFilter, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  // Client-side filtering for search and project (text-based)
  const filtered = tasks.filter((task) => {
    const empName = profiles[task.user_id] || ''
    if (search && !empName.toLowerCase().includes(search.toLowerCase())) return false
    if (projectFilter && !task.project_name.toLowerCase().includes(projectFilter.toLowerCase())) return false
    return true
  })

  async function handleSaveEdit(e) {
    e.preventDefault()
    setError('')

    const task = tasks.find((t) => t.id === editing.id)
    if (!task) return

    const updates = {
      project_name: editing.project_name.trim(),
      task_name: editing.task_name.trim(),
      status: editing.status,
    }

    // Determine start_time
    let finalStartTime = task.start_time
    if (editing.start_time) {
      finalStartTime = combineDateTime(task.task_date, editing.start_time)
      updates.start_time = finalStartTime
    }

    // Handle end_time and duration based on status
    if (editing.status === 'Completed') {
      if (editing.end_time) {
        const finalEndTime = combineDateTime(task.task_date, editing.end_time)
        updates.end_time = finalEndTime
        updates.duration_minutes = minutesBetween(finalStartTime, finalEndTime)
      } else if (task.end_time) {
        updates.duration_minutes = minutesBetween(finalStartTime, task.end_time)
      } else {
        const now = new Date()
        updates.end_time = now.toISOString()
        updates.duration_minutes = minutesBetween(finalStartTime, now)
      }
    } else {
      // Clear end_time and duration for non-completed tasks
      updates.end_time = null
      updates.duration_minutes = null
    }

    const { error: uErr } = await supabase.from('tasks').update(updates).eq('id', editing.id)
    if (uErr) {
      setError(uErr.message)
      return
    }
    setEditing(null)
    await load()
  }

  async function handleDelete(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return
    const { error: dErr } = await supabase.from('tasks').delete().eq('id', taskId)
    if (dErr) {
      setError(dErr.message)
      return
    }
    await load()
  }

  function startEdit(task) {
    setEditing({
      id: task.id,
      project_name: task.project_name,
      task_name: task.task_name,
      status: task.status,
      start_time: formatTimeInput(task.start_time),
      end_time: task.end_time ? formatTimeInput(task.end_time) : '',
    })
  }

  return (
    <section className="card">
      <h2 className="section-title">All Employee Work</h2>

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
                      <td>{profiles[task.user_id] || '—'}</td>
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
                        <input type="time" value={editing.start_time}
                          onChange={(e) => setEditing({ ...editing, start_time: e.target.value })} />
                      </td>
                      <td>
                        <input type="time" value={editing.end_time}
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
                    <td>{profiles[task.user_id] || '—'}</td>
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

function formatTimeInput(t) {
  if (!t) return ''
  const d = new Date(t)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function combineDateTime(dateStr, timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(dateStr + 'T00:00:00')
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}
