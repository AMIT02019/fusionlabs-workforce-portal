import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'
import {
  formatTime,
  formatDuration,
  minutesBetween,
} from '../lib/format'
import { TASK_STATUS_COLORS } from '../lib/status'

export default function TaskSection({ profile, today }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [project, setProject] = useState('')
  const [taskName, setTaskName] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.tasks.getToday(today)
      setTasks(res.tasks || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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

    try {
      await api.tasks.create(project.trim(), taskName.trim(), today)
      setProject('')
      setTaskName('')
      setShowForm(false)
      await loadTasks()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleStatusChange(task, newStatus) {
    setError('')
    try {
      await api.tasks.update(task.id, { status: newStatus })
      await loadTasks()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setError('')

    try {
      await api.tasks.update(editing.id, {
        project_name: editing.project_name.trim(),
        task_name: editing.task_name.trim(),
        status: editing.status,
      })
      setEditing(null)
      await loadTasks()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return
    try {
      await api.tasks.delete(taskId)
      await loadTasks()
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
      _originalStatus: task.status,
    })
  }

  return (
    <section className="card">
      <div className="section-head">
        <h2 className="section-title">Today's Tasks ({tasks.length})</h2>
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
              placeholder="e.g. Website Redesign"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Task Name</span>
            <input
              type="text"
              placeholder="e.g. Design homepage layout"
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
                      <td>{task.user_name || '—'}</td>
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
                    <td>
                      {task.user_name || '—'}
                      {isOwner && <span className="muted small-text"> (You)</span>}
                    </td>
                    <td><strong>{task.project_name}</strong></td>
                    <td>{task.task_name}</td>
                    <td>{formatTime(task.start_time)}</td>
                    <td>{formatTime(task.end_time) || '--'}</td>
                    <td>
                      {task.duration_minutes != null
                        ? formatDuration(task.duration_minutes)
                        : task.status === 'Completed'
                        ? '0m'
                        : `${formatDuration(minutesBetween(task.start_time, new Date()))} (active)`}
                    </td>
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
