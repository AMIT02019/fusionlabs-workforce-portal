import { useState, useEffect, useCallback } from 'react'
import { api } from '../../lib/api'
import {
  formatShortDate,
  formatDay,
  formatTime,
  formatDuration,
  dateKey,
  attendanceStatus,
} from '../../lib/format'
import { statusClass, TASK_STATUS_COLORS } from '../../lib/status'
import { exportToCSV } from '../../lib/export'
import ResetPasswordModal from './ResetPasswordModal'
import DeleteEmployeeModal from './DeleteEmployeeModal'

export default function EmployeeDetail({ employee, todayAttendance, onClose, onDeleted }) {
  const [attendance, setAttendance] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingTask, setEditingTask] = useState(null)
  const [error, setError] = useState('')
  const [showReset, setShowReset] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.employees.getDetail(employee.id)
      setAttendance(res.attendance || [])
      setTasks(res.tasks || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [employee.id])

  useEffect(() => {
    load()
  }, [load])

  // Build attendance summary over working days
  const joinDate = new Date(employee.created_at || Date.now())
  joinDate.setHours(0, 0, 0, 0)
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)

  let workingDays = 0
  for (let d = new Date(joinDate); d <= todayDate; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) workingDays++
  }

  if (workingDays === 0) workingDays = 1

  let presentCount = 0
  let halfdayCount = 0
  let absentCount = 0
  let totalMinutes = 0

  const attByDate = {}
  attendance.forEach((r) => { attByDate[r.attendance_date] = r })

  for (let d = new Date(joinDate); d <= todayDate; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay()
    if (dow === 0 || dow === 6) continue
    const key = dateKey(d)
    const rec = attByDate[key]
    const stat = rec?.status || attendanceStatus(rec?.working_minutes)
    if (stat === 'PRESENT') presentCount++
    else if (stat === 'HALF DAY') halfdayCount++
    else absentCount++
    if (rec?.working_minutes) totalMinutes += rec.working_minutes
  }

  const attendancePct = workingDays > 0
    ? (((presentCount + halfdayCount * 0.5) / workingDays) * 100).toFixed(1)
    : '0.0'

  function handleExportEmployeeAttendance() {
    const headers = ['Date', 'Day', 'Check In', 'Check Out', 'Working Hours', 'Status']
    const rows = attendance.map((r) => [
      r.attendance_date,
      formatDay(r.attendance_date),
      r.check_in ? formatTime(r.check_in) : '--',
      r.check_out ? formatTime(r.check_out) : '--',
      r.working_minutes != null ? formatDuration(r.working_minutes) : '--',
      r.status || attendanceStatus(r.working_minutes),
    ])
    exportToCSV(`${employee.name.replace(/\s+/g, '_')}_Attendance_Report`, headers, rows)
  }

  function handleExportEmployeeTasks() {
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
    exportToCSV(`${employee.name.replace(/\s+/g, '_')}_Tasks_Report`, headers, rows)
  }

  async function handleSaveTaskEdit(e) {
    e.preventDefault()
    setError('')

    try {
      await api.tasks.update(editingTask.id, {
        project_name: editingTask.project_name.trim(),
        task_name: editingTask.task_name.trim(),
        status: editingTask.status,
        start_time: editingTask.start_time,
        end_time: editingTask.end_time || null,
      })
      setEditingTask(null)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return
    try {
      await api.tasks.delete(taskId)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  function startEdit(task) {
    setEditingTask({
      id: task.id,
      project_name: task.project_name,
      task_name: task.task_name,
      status: task.status,
      start_time: task.start_time,
      end_time: task.end_time || '',
    })
  }

  const todayAtt = todayAttendance

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{employee.name}</div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {error && <p className="form-error" style={{ marginBottom: '16px' }}>{error}</p>}

          {/* Employee info */}
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Email</span>
              <span className="detail-value">{employee.email}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Joined</span>
              <span className="detail-value">{formatShortDate(employee.created_at)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Today's Status</span>
              {todayAtt?.status || todayAtt?.working_minutes != null ? (
                (() => {
                  const stat = todayAtt.status || attendanceStatus(todayAtt.working_minutes)
                  return (
                    <span className={`status-badge ${statusClass(stat)}`}>
                      {stat === 'PRESENT'
                        ? '🟢 PRESENT'
                        : stat === 'HALF DAY'
                        ? '🟡 HALF DAY'
                        : '🔴 ABSENT'}
                    </span>
                  )
                })()
              ) : (
                <span className="muted">No check-in</span>
              )}
            </div>
            <div className="detail-item">
              <span className="detail-label">Check In</span>
              <span className="detail-value">{todayAtt?.check_in ? formatTime(todayAtt.check_in) : '--'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Check Out</span>
              <span className="detail-value">{todayAtt?.check_out ? formatTime(todayAtt.check_out) : '--'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Working Hours</span>
              <span className="detail-value">{todayAtt?.working_minutes != null ? formatDuration(todayAtt.working_minutes) : '--'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
            <button className="btn btn-outline btn-sm" onClick={() => setShowReset(true)}>
              🔑 Reset Password
            </button>
            <button className="btn btn-outline btn-sm" onClick={handleExportEmployeeAttendance}>
              📥 Export Attendance
            </button>
            <button className="btn btn-outline btn-sm" onClick={handleExportEmployeeTasks}>
              📥 Export Tasks
            </button>
            <button
              className="btn btn-danger btn-sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => setShowDelete(true)}
            >
              🗑️ Remove Employee
            </button>
          </div>

          {/* Attendance summary */}
          <h3 className="section-title">Attendance Summary</h3>
          <div className="summary-mini">
            <div className="summary-mini-item">
              <div className="summary-mini-label">Working Days</div>
              <div className="summary-mini-value">{workingDays}</div>
            </div>
            <div className="summary-mini-item">
              <div className="summary-mini-label">Present</div>
              <div className="summary-mini-value" style={{ color: 'var(--present)' }}>{presentCount}</div>
            </div>
            <div className="summary-mini-item">
              <div className="summary-mini-label">Half Days</div>
              <div className="summary-mini-value" style={{ color: 'var(--halfday)' }}>{halfdayCount}</div>
            </div>
            <div className="summary-mini-item">
              <div className="summary-mini-label">Absent</div>
              <div className="summary-mini-value" style={{ color: 'var(--absent)' }}>{absentCount}</div>
            </div>
            <div className="summary-mini-item">
              <div className="summary-mini-label">Total Hours</div>
              <div className="summary-mini-value">{formatDuration(totalMinutes)}</div>
            </div>
            <div className="summary-mini-item">
              <div className="summary-mini-label">Attendance %</div>
              <div className="summary-mini-value" style={{ color: 'var(--primary)' }}>{attendancePct}%</div>
            </div>
          </div>

          {/* Attendance history */}
          <h3 className="section-title">Attendance History</h3>
          {loading ? (
            <p className="muted">Loading…</p>
          ) : attendance.length === 0 ? (
            <p className="muted" style={{ marginBottom: '20px' }}>No attendance records found.</p>
          ) : (
            <div className="table-wrap" style={{ marginBottom: '24px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Working Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((r, i) => (
                    <tr key={i}>
                      <td>{formatShortDate(r.attendance_date)}</td>
                      <td>{formatDay(r.attendance_date)}</td>
                      <td>{formatTime(r.check_in) || '--'}</td>
                      <td>{formatTime(r.check_out) || '--'}</td>
                      <td>{formatDuration(r.working_minutes) || '--'}</td>
                      <td>
                        {(() => {
                          const stat = r.status || attendanceStatus(r.working_minutes)
                          return (
                            <span className={`status-badge ${statusClass(stat)}`}>
                              {stat === 'PRESENT'
                                ? '🟢 PRESENT'
                                : stat === 'HALF DAY'
                                ? '🟡 HALF DAY'
                                : '🔴 ABSENT'}
                            </span>
                          )
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Daily work */}
          <h3 className="section-title">Daily Work</h3>
          {loading ? (
            <p className="muted">Loading…</p>
          ) : tasks.length === 0 ? (
            <p className="muted">No tasks recorded yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
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
                  {tasks.map((task) => {
                    if (editingTask && editingTask.id === task.id) {
                      return (
                        <tr key={task.id}>
                          <td>{formatShortDate(task.task_date)}</td>
                          <td>{formatDay(task.task_date)}</td>
                          <td>
                            <input type="text" value={editingTask.project_name}
                              onChange={(e) => setEditingTask({ ...editingTask, project_name: e.target.value })} />
                          </td>
                          <td>
                            <input type="text" value={editingTask.task_name}
                              onChange={(e) => setEditingTask({ ...editingTask, task_name: e.target.value })} />
                          </td>
                          <td>
                            <input type="time" value={editingTask.start_time}
                              onChange={(e) => setEditingTask({ ...editingTask, start_time: e.target.value })} />
                          </td>
                          <td>
                            <input type="time" value={editingTask.end_time}
                              onChange={(e) => setEditingTask({ ...editingTask, end_time: e.target.value })} />
                          </td>
                          <td>{formatDuration(task.duration_minutes) || '--'}</td>
                          <td>
                            <select value={editingTask.status}
                              onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}>
                              <option>Not Done</option>
                              <option>Half Done</option>
                              <option>Completed</option>
                            </select>
                          </td>
                          <td className="actions-cell">
                            <button className="btn btn-primary btn-sm" onClick={handleSaveTaskEdit}>Save</button>
                            <button className="btn btn-outline btn-sm" onClick={() => setEditingTask(null)}>Cancel</button>
                          </td>
                        </tr>
                      )
                    }
                    return (
                      <tr key={task.id}>
                        <td>{formatShortDate(task.task_date)}</td>
                        <td>{formatDay(task.task_date)}</td>
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
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTask(task.id)}>Delete</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>

      {showReset && (
        <ResetPasswordModal employee={employee} onClose={() => setShowReset(false)} />
      )}

      {showDelete && (
        <DeleteEmployeeModal
          employee={employee}
          onClose={() => setShowDelete(false)}
          onDeleted={() => {
            setShowDelete(false)
            if (onDeleted) onDeleted(employee)
            onClose()
          }}
        />
      )}
    </div>
  )
}
