import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// On Vercel, the repository root is read-only; use /tmp for SQLite database
const dbDir = process.env.VERCEL ? '/tmp' : __dirname
const dbPath = path.join(dbDir, 'database.sqlite')

export const db = new Database(dbPath)

// Enable foreign keys & WAL mode for performance
try {
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
} catch (e) {
  console.warn('Pragma warning:', e)
}

// Initialize Database Schema
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      attendance_date TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT,
      working_minutes INTEGER,
      status TEXT CHECK (status IN ('PRESENT', 'HALF DAY', 'ABSENT')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, attendance_date)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_name TEXT NOT NULL,
      task_name TEXT NOT NULL,
      task_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_minutes INTEGER,
      status TEXT NOT NULL DEFAULT 'Not Done' CHECK (status IN ('Not Done', 'Half Done', 'Completed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, attendance_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, task_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(task_date);
  `)

  // Seed default Admin user if not present
  const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin')
  if (!adminExists) {
    const adminPasswordHash = bcrypt.hashSync('admin123', 10)
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run('admin-1', 'Administrator', 'admin@fusionlabs.com', adminPasswordHash, 'admin')
    console.log('✅ Default Admin seeded: admin@fusionlabs.com / admin123')
  }

  // Seed sample employees if no employees present
  const empCount = db.prepare('SELECT count(*) as count FROM users WHERE role = ?').get('employee').count
  if (empCount === 0) {
    const emp1Hash = bcrypt.hashSync('employee123', 10)
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run('emp-1', 'Alex Morgan', 'alex@fusionlabs.com', emp1Hash, 'employee')

    const emp2Hash = bcrypt.hashSync('employee123', 10)
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', '-30 days'))
    `).run('emp-2', 'Sarah Connor', 'sarah@fusionlabs.com', emp2Hash, 'employee')

    console.log('✅ Sample Employees seeded: alex@fusionlabs.com / employee123')
  }
}
