import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'
import {
  formatTime,
  formatDuration,
  minutesBetween,
} from '../lib/format'
import { TASK_STATUS_COLORS } from '../lib/status'

export default function TaskSection({ profile, today, onTaskChange }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [project, setProject] = useState('')
  const [taskName, setTaskName] = useState('')
  const [error, setError] = useState('')
  const [taskMessage, setTaskMessage] = useState('')
  const [editing, setEditing] = useState(null)

  const loadTasks = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true)
    try {
      // Load today's tasks for current employee
      const res = await api.tasks.getMy({ date: today })
      setTasks(res.tasks || [])
    } catch (err) {
      if (!isBackground) setError(err.message)
    } finally {
      if (!isBackground) setLoading(false)
    }
  }, [today])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  async function handleAddTask(e) {
    e.preventDefault()
    setError('')
    setTaskMessage('')

    if (!project.trim() || !taskName.trim()) {
      setError('Project and task name are required.')
      return
    }

    try {
      await api.tasks.create(project.trim(), taskName.trim(), today)
      setProject('')
      setTaskName('')
      setShowForm(false)
      setTaskMessage('✅ Task added successfully!')
      setTimeout(() => setTaskMessage(''), 4000)
      await loadTasks()
      if (onTaskChange) onTaskChange()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleStatusChange(task, newStatus) {
    setError('')
    try {
      await api.tasks.update(task.id, { status: newStatus })
      setTaskMessage(`✅ Task status updated to "${newStatus}"!`)
      setTimeout(() => setTaskMessage(''), 4000)
      await loadTasks()
      if (onTaskChange) onTaskChange()
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
      setTaskMessage('✅ Task updated successfully!')
      setTimeout(() => setTaskMessage(''), 4000)
      await loadTasks()
      if (onTaskChange) onTaskChange()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return
    try {
      await api.tasks.delete(taskId)
      setTaskMessage('🗑️ Task deleted.')
      setTimeout(() => setTaskMessage(''), 4000)
      await loadTasks()
      if (onTaskChange) onTaskChange()
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
    })
  }

  return (
    <section className="card" style={{ marginTop: '24px' }}>
      <div className="section-head">
        <div>
          <h2 className="section-title">Today's Tasks ({tasks.length})</h2>
          <p className="muted" style={{ fontSize: '13px', margin: '4px 0 0 0' }}>
            Add, update, or track your assignments for today
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? '✖ Close Form' : '+ Add Task'}
        </button>
      </div>

      {taskMessage && (
        <div className="success-msg" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{taskMessage}</span>
          <button onClick={() => setTaskMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>&times;</button>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      {showForm && (
        <form onSubmit={handleAddTask} className="inline-form" style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">Add Task</button>
            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel / Close</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="muted">Loading today's tasks…</p>
      ) : tasks.length === 0 ? (
        <p className="muted">No tasks added yet for today. Click "+ Add Task" to begin.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
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
                if (editing && editing.id === task.id) {
                  return (
                    <tr key={task.id}>
                      <td>
                        <input
                          type="text"
                          value={editing.project_name}
                          onChange={(e) => setEditing({ ...editing, project_name: e.target.value })}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editing.task_name}
                          onChange={(e) => setEditing({ ...editing, task_name: e.target.value })}
                          required
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
                          <option value="Not Done">🔴 Not Done</option>
                          <option value="Half Done">🟡 Half Done</option>
                          <option value="Completed">🟢 Completed</option>
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
