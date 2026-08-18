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

// Helper: Get Monday and Sunday of current week in YYYY-MM-DD
function getWeekRange(d = new Date()) {
  const date = new Date(d)
  const day = date.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const format = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  return {
    monday: format(monday),
    sunday: format(sunday),
  }
}

// GET /api/tasks/workforce-table (Powers the main employee dashboard overview table: Employee | Project | Task | Check In | Day hr | Week hr)
router.get('/workforce-table', authenticateToken, async (req, res) => {
  await ensureUser(req.user)
  const { fromDate, toDate } = req.query
  const todayStr = new Date().toISOString().split('T')[0]
  const from = fromDate || todayStr
  const to = toDate || todayStr

  // 1. Fetch tasks within the date range
  const tasks = await db.all(
    `SELECT t.*, 
            COALESCE(u.name, 'Team Member') as user_name, 
            u.email as user_email,
            a.check_in,
            a.check_out,
            a.working_minutes,
            a.status as attendance_status
     FROM tasks t
     LEFT JOIN users u ON t.user_id = u.id
     LEFT JOIN attendance a ON t.user_id = a.user_id AND t.task_date = a.attendance_date
     WHERE t.task_date >= ? AND t.task_date <= ?
     ORDER BY t.task_date DESC, t.start_time DESC, t.created_at DESC`,
    [from, to]
  )

  // 2. Compute weekly working minutes for the users
  const { monday, sunday } = getWeekRange(new Date(to))
  const weekRecords = await db.all(
    `SELECT user_id, SUM(COALESCE(working_minutes, 0)) as total_week_minutes
     FROM attendance
     WHERE attendance_date >= ? AND attendance_date <= ?
     GROUP BY user_id`,
    [monday, sunday]
  )

  const weekMap = {}
  weekRecords.forEach((r) => {
    weekMap[r.user_id] = Number(r.total_week_minutes) || 0
  })

  const enrichedTasks = tasks.map((t) => {
    // If today is active and not checked out, calculate live elapsed
    let dayMins = t.working_minutes
    if (t.check_in && !t.check_out && t.task_date === todayStr) {
      dayMins = Math.max(0, Math.round((Date.now() - new Date(t.check_in).getTime()) / 60000))
    }

    let userWeekMins = weekMap[t.user_id] || 0
    if (t.check_in && !t.check_out && t.task_date === todayStr) {
      userWeekMins += dayMins || 0
    }

    return {
      ...t,
      day_minutes: dayMins,
      week_minutes: userWeekMins,
    }
  })

  res.json({ tasks: enrichedTasks })
})

// GET /api/tasks/today (Shared team tasks for today)
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

// GET /api/tasks/my (Logged in employee's own task history with filters)
router.get('/my', authenticateToken, async (req, res) => {
  await ensureUser(req.user)
  const { date, fromDate, toDate, project, status } = req.query

  let query = `
    SELECT t.*, COALESCE(u.name, 'Team Member') as user_name, u.email as user_email
    FROM tasks t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE t.user_id = ?
  `
  const params = [req.user.id]

  if (date) {
    query += ` AND t.task_date = ?`
    params.push(date)
  }
  if (fromDate) {
    query += ` AND t.task_date >= ?`
    params.push(fromDate)
  }
  if (toDate) {
    query += ` AND t.task_date <= ?`
    params.push(toDate)
  }
  if (project && project.trim()) {
    query += ` AND lower(t.project_name) LIKE ?`
    params.push(`%${project.trim().toLowerCase()}%`)
  }
  if (status && status !== 'all') {
    query += ` AND t.status = ?`
    params.push(status)
  }

  query += ` ORDER BY t.task_date DESC, t.start_time DESC, t.created_at DESC`

  const tasks = await db.all(query, params)
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
  let finalEnd = task.end_time
  let finalDuration = task.duration_minutes

  // CRITICAL STATUS RULES:
  if (finalStatus === 'Completed') {
    const now = new Date()
    finalEnd = end_time || now.toISOString()
    const s = new Date(finalStart).getTime()
    const e = new Date(finalEnd).getTime()
    finalDuration = Math.max(0, Math.round((e - s) / 60000))
  } else {
    finalEnd = null
    finalDuration = null
  }

  await db.run(
    `UPDATE tasks
     SET project_name = ?, task_name = ?, status = ?, start_time = ?, end_time = ?, duration_minutes = ?, updated_at = NOW()
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

// GET /api/tasks/all (Admin query for all workforce work with filters)
router.get('/all', authenticateToken, async (req, res) => {
  const { userId, date, fromDate, toDate, project, status, search } = req.query

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
  if (fromDate) {
    query += ` AND t.task_date >= ?`
    params.push(fromDate)
  }
  if (toDate) {
    query += ` AND t.task_date <= ?`
    params.push(toDate)
  }
  if (project && project.trim()) {
    query += ` AND lower(t.project_name) LIKE ?`
    params.push(`%${project.trim().toLowerCase()}%`)
  }
  if (status && status !== 'all') {
    query += ` AND t.status = ?`
    params.push(status)
  }
  if (search && search.trim()) {
    query += ` AND (lower(u.name) LIKE ? OR lower(u.email) LIKE ? OR lower(t.project_name) LIKE ? OR lower(t.task_name) LIKE ?)`
    const term = `%${search.trim().toLowerCase()}%`
    params.push(term, term, term, term)
  }

  query += ` ORDER BY t.task_date DESC, t.start_time DESC, t.created_at DESC`

  const tasks = await db.all(query, params)
  res.json({ tasks })
})

export default router
