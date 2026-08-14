import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  formatTime,
  formatDuration,
  dateKey,
  minutesBetween,
} from '../lib/format'
import { TASK_STATUS_COLORS } from '../lib/status'

export default function TaskSection({ profile, today }) {
  const [tasks, setTasks] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [project, setProject] = useState('')
  const [taskName, setTaskName] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // { id, project_name, task_name, status }

  const loadTasks = useCallback(async () => {
    setLoading(true)
    // Everyone's tasks for today (shared visibility)
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id,
        user_id,
        project_name,
        task_name,
        task_date,
        start_time,
        end_time,
        duration_minutes,
        status,
        updated_at
      `)
      .eq('task_date', today)
      .order('start_time', { ascending: true })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setTasks(data || [])

    // Fetch all profiles to map user_id -> name (shared visibility needs names)
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

    setLoading(false)
  }, [today])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  async function handleAddTask(e) {
    e.preventDefault()
    setError('')
    if (!project.trim() || !taskName.trim()) {
      setError('Project and task name are required.')
      return
    }
    const now = new Date().toISOString()
    const { error } = await supabase.from('tasks').insert({
      user_id: profile.id,
      project_name: project.trim(),
      task_name: taskName.trim(),
      task_date: today,
      start_time: now,
      status: 'Not Done',
    })
    if (error) {
      setError(error.message)
      return
    }
    setProject('')
    setTaskName('')
    setShowForm(false)
    await loadTasks()
  }

  async function handleStatusChange(task, newStatus) {
    setError('')
    const updates = { status: newStatus }

    if (newStatus === 'Completed' && !task.end_time) {
      const now = new Date()
      updates.end_time = now.toISOString()
      updates.duration_minutes = minutesBetween(task.start_time, now)
    }

    const { error } = await supabase.from('tasks').update(updates).eq('id', task.id)
    if (error) {
      setError(error.message)
      return
    }
    await loadTasks()
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setError('')
    const updates = {
      project_name: editing.project_name.trim(),
      task_name: editing.task_name.trim(),
    }

    // Status change handled via the same path
    if (editing.status !== editing._originalStatus) {
      updates.status = editing.status
      const task = tasks.find((t) => t.id === editing.id)
      if (editing.status === 'Completed' && task && !task.end_time) {
        const now = new Date()
        updates.end_time = now.toISOString()
        updates.duration_minutes = minutesBetween(task.start_time, now)
      }
    }

    const { error } = await supabase.from('tasks').update(updates).eq('id', editing.id)
    if (error) {
      setError(error.message)
      return
    }
    setEditing(null)
    await loadTasks()
  }

  async function handleDelete(taskId) {
    if (!confirm('Delete this task?')) return
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (error) {
      setError(error.message)
      return
    }
    await loadTasks()
  }

  function startEdit(task) {
    setEditing({
      id: task.id,
      project_name: task.project_name,
      task_name: task.task_name,
      status: task.status,
      _originalStatus: task.status,
    })
  }

  return (
    <section className="card">
      <div className="section-head">
        <h2 className="section-title">Today's Tasks</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Add Task'}
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {showForm && (
        <form onSubmit={handleAddTask} className="inline-form">
          <label className="field">
            <span>Project Name</span>
            <input
              type="text"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Task Name</span>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary">Add Task</button>
        </form>
      )}

      {loading ? (
        <p className="muted">Loading tasks…</p>
      ) : tasks.length === 0 ? (
        <p className="muted">No tasks added yet today.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
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
                const isOwner = task.user_id === profile.id
                if (editing && editing.id === task.id) {
                  return (
                    <tr key={task.id}>
                      <td>{profiles[task.user_id] || '—'}</td>
                      <td>
                        <input
                          type="text"
                          value={editing.project_name}
                          onChange={(e) => setEditing({ ...editing, project_name: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editing.task_name}
                          onChange={(e) => setEditing({ ...editing, task_name: e.target.value })}
                        />
                      </td>
                      <td>{formatTime(task.start_time)}</td>
                      <td>{formatTime(task.end_time) || '--'}</td>
                      <td>{formatDuration(task.duration_minutes) || '--'}</td>
                      <td>
                        <select
                          value={editing.status}
                          onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                        >
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
                    <td>{task.project_name}</td>
                    <td>{task.task_name}</td>
                    <td>{formatTime(task.start_time)}</td>
                    <td>{formatTime(task.end_time) || '--'}</td>
                    <td>{formatDuration(task.duration_minutes) || '--'}</td>
                    <td>
                      {isOwner ? (
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task, e.target.value)}
                          className={`task-select ${TASK_STATUS_COLORS[task.status]}`}
                        >
                          <option>Not Done</option>
                          <option>Half Done</option>
                          <option>Completed</option>
                        </select>
                      ) : (
                        <span className={`task-badge ${TASK_STATUS_COLORS[task.status]}`}>{task.status}</span>
                      )}
                    </td>
                    <td className="actions-cell">
                      {isOwner ? (
                        <>
                          <button className="btn btn-outline btn-sm" onClick={() => startEdit(task)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(task.id)}>Delete</button>
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
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
