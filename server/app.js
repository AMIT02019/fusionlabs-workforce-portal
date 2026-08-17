import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initDB } from './db.js'
import authRoutes from './routes/auth.js'
import attendanceRoutes from './routes/attendance.js'
import tasksRoutes from './routes/tasks.js'
import employeesRoutes from './routes/employees.js'

dotenv.config()

export const app = express()

// Middlewares
app.use(cors({ origin: '*' }))
app.use(express.json())

// Initialize Database & Seeds
initDB()

// Register Routes
app.use('/api/auth', authRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/tasks', tasksRoutes)
app.use('/api/employees', employeesRoutes)

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

export default app
