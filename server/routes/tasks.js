import { Router } from 'express'
import { randomUUID } from 'crypto'
import { db } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// Helper: Ensure user exists in users table on this worker/db
async function ensureUser(user) {
  if (!user?.id) return
  try {
    await db.run(
      `INSERT INTO users (id, name, email, password_hash, role)
       VALUES (?, ?, ?, '', ?)
       ON CONFLICT (id) DO NOTHING`,
      [user.id, user.name || user.email?.split('@')[0] || 'Employee', user.email || '', user.role || 'employee']
    )
  } catch (e) {}
}

// GET /api/tasks/today (Shared team tasks for today - visible to everyone)
router.get('/today', authenticateToken, async (req, res) => {
  await ensureUser(req.user)
  const dateStr = req.query.date || new Date().toISOString().split('T')[0]

  const tasks = await db.all(
    `SELECT t.*, COALESCE(u.name, 'Team Member') as user_name, u.email as user_email
     FROM tasks t
     LEFT JOIN users u ON t.user_id = u.id
     WHERE t.task_date = ?
     ORDER BY t.start_time ASC, t.created_at ASC`,
    [dateStr]
  )

  res.json({ tasks })
})

// POST /api/tasks (Create a task)
router.post('/', authenticateToken, async (req, res) => {
  await ensureUser(req.user)
  const { project_name, task_name, task_date } = req.body

  if (!project_name?.trim() || !task_name?.trim()) {
    return res.status(400).json({ error: 'Project name and task name are required' })
  }

  const id = randomUUID()
  const today = task_date || new Date().toISOString().split('T')[0]
  const now = new Date().toISOString()

  await db.run(
    `INSERT INTO tasks (id, user_id, project_name, task_name, task_date, start_time, status)
     VALUES (?, ?, ?, ?, ?, ?, 'Not Done')`,
    [id, req.user.id, project_name.trim(), task_name.trim(), today, now]
  )

  const task = await db.get(
    `SELECT t.*, COALESCE(u.name, 'Team Member') as user_name, u.email as user_email
     FROM tasks t
     LEFT JOIN users u ON t.user_id = u.id
     WHERE t.id = ?`,
    [id]
  )

  res.status(201).json({ message: 'Task created successfully', task })
})

// PUT /api/tasks/:id (Update task - Owner or Admin)
router.put('/:id', authenticateToken, async (req, res) => {
  await ensureUser(req.user)
  const taskId = req.params.id
  const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId])

  if (!task) {
    return res.status(404).json({ error: 'Task not found' })
  }

  // Must be owner or admin
  if (task.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: You can only edit your own tasks' })
  }

  const { project_name, task_name, status, start_time, end_time, duration_minutes } = req.body

  let finalProject = project_name !== undefined ? project_name.trim() : task.project_name
  let finalTask = task_name !== undefined ? task_name.trim() : task.task_name
  let finalStatus = status !== undefined ? status : task.status
  let finalStart = start_time !== undefined ? start_time : task.start_time
  let finalEnd = end_time !== undefined ? end_time : task.end_time
  let finalDuration = duration_minutes !== undefined ? duration_minutes : task.duration_minutes

  // Auto-calculate end_time & duration if marked completed and end_time not provided
  if (finalStatus === 'Completed' && !finalEnd) {
    const now = new Date()
    finalEnd = now.toISOString()
    const s = new Date(finalStart).getTime()
    const e = now.getTime()
    finalDuration = Math.max(0, Math.round((e - s) / 60000))
  } else if (finalStatus !== 'Completed' && end_time === undefined) {
    finalEnd = null
    finalDuration = null
  }

  await db.run(
    `UPDATE tasks
     SET project_name = ?, task_name = ?, status = ?, start_time = ?, end_time = ?, duration_minutes = ?
     WHERE id = ?`,
    [finalProject, finalTask, finalStatus, finalStart, finalEnd, finalDuration, taskId]
  )

  const updated = await db.get(
    `SELECT t.*, COALESCE(u.name, 'Team Member') as user_name, u.email as user_email
     FROM tasks t
     LEFT JOIN users u ON t.user_id = u.id
     WHERE t.id = ?`,
    [taskId]
  )

  res.json({ message: 'Task updated successfully', task: updated })
})

// DELETE /api/tasks/:id (Delete task - Owner or Admin)
router.delete('/:id', authenticateToken, async (req, res) => {
  await ensureUser(req.user)
  const taskId = req.params.id
  const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId])

  if (!task) {
    return res.status(404).json({ error: 'Task not found' })
  }

  if (task.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: You can only delete your own tasks' })
  }

  await db.run('DELETE FROM tasks WHERE id = ?', [taskId])
  res.json({ message: 'Task deleted successfully' })
})

// GET /api/tasks/all (Admin / Manager query for all workforce work with filters)
router.get('/all', authenticateToken, async (req, res) => {
  const { userId, date, status } = req.query

  let query = `
    SELECT t.*, COALESCE(u.name, 'Team Member') as user_name, u.email as user_email
    FROM tasks t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE 1=1
  `
  const params = []

  if (userId && userId !== 'all') {
    query += ` AND t.user_id = ?`
    params.push(userId)
  }
  if (date) {
    query += ` AND t.task_date = ?`
    params.push(date)
  }
  if (status && status !== 'all') {
    query += ` AND t.status = ?`
    params.push(status)
  }

  query += ` ORDER BY t.task_date DESC, t.start_time DESC, t.created_at DESC`

  const tasks = await db.all(query, params)
  res.json({ tasks })
})

export default router
