import Database from 'better-sqlite3'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import path from 'path'
import { fileURLToPath } from 'url'

const { Pool } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL

export const isPostgres = Boolean(DATABASE_URL)

let pgPool = null
let sqliteDb = null

if (isPostgres) {
  console.log('🐘 Connecting to Cloud PostgreSQL database...')
  pgPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  })
} else {
  // On Vercel, the repository root is read-only; use /tmp for SQLite database
  const dbDir = process.env.VERCEL ? '/tmp' : __dirname
  const dbPath = path.join(dbDir, 'database.sqlite')
  sqliteDb = new Database(dbPath)
  try {
    sqliteDb.pragma('journal_mode = WAL')
    sqliteDb.pragma('foreign_keys = OFF')
  } catch (e) {}
}

// Convert SQLite '?' placeholders to PostgreSQL '$1, $2, $3'
function formatPgQuery(sql) {
  let index = 1
  return sql.replace(/\?/g, () => `$${index++}`)
}

// Unified Database Client
export const db = {
  isPostgres,

  async get(sql, params = []) {
    if (isPostgres) {
      const pgSql = formatPgQuery(sql)
      const res = await pgPool.query(pgSql, params)
      return res.rows[0] || null
    } else {
      return sqliteDb.prepare(sql).get(...params) || null
    }
  },

  async all(sql, params = []) {
    if (isPostgres) {
      const pgSql = formatPgQuery(sql)
      const res = await pgPool.query(pgSql, params)
      return res.rows
    } else {
      return sqliteDb.prepare(sql).all(...params)
    }
  },

  async run(sql, params = []) {
    if (isPostgres) {
      const pgSql = formatPgQuery(sql)
      const res = await pgPool.query(pgSql, params)
      return { changes: res.rowCount }
    } else {
      return sqliteDb.prepare(sql).run(...params)
    }
  },

  // Raw helper
  prepare(sql) {
    if (isPostgres) {
      return {
        get: async (...params) => db.get(sql, params),
        all: async (...params) => db.all(sql, params),
        run: async (...params) => db.run(sql, params),
      }
    } else {
      return sqliteDb.prepare(sql)
    }
  },
}

// Database Initialization & Migrations
export async function initDB() {
  if (isPostgres) {
    try {
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS attendance (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          attendance_date TEXT NOT NULL,
          check_in TEXT,
          check_out TEXT,
          working_minutes INTEGER,
          status TEXT CHECK (status IN ('PRESENT', 'HALF DAY', 'ABSENT')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, attendance_date);
        CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, task_date);
        CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(task_date);
      `)

      // Seed default admin if missing
      const adminRes = await pgPool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
      if (adminRes.rowCount === 0) {
        const adminPasswordHash = bcrypt.hashSync('admin123', 10)
        await pgPool.query(
          `INSERT INTO users (id, name, email, password_hash, role, created_at)
           VALUES ($1, $2, $3, $4, 'admin', NOW())
           ON CONFLICT (email) DO NOTHING`,
          ['admin-1', 'Administrator', 'admin@fusionlabs.com', adminPasswordHash]
        )
        console.log('✅ PostgreSQL: Default Admin seeded: admin@fusionlabs.com / admin123')
      }

      // Seed sample employees if missing
      const empRes = await pgPool.query("SELECT id FROM users WHERE role = 'employee' LIMIT 1")
      if (empRes.rowCount === 0) {
        const empHash = bcrypt.hashSync('employee123', 10)
        await pgPool.query(
          `INSERT INTO users (id, name, email, password_hash, role, created_at)
           VALUES ($1, $2, $3, $4, 'employee', NOW())
           ON CONFLICT (email) DO NOTHING`,
          ['emp-1', 'Alex Morgan', 'alex@fusionlabs.com', empHash]
        )
        console.log('✅ PostgreSQL: Sample Employee seeded: alex@fusionlabs.com / employee123')
      }
      console.log('✅ Cloud PostgreSQL initialized successfully.')
    } catch (err) {
      console.error('❌ PostgreSQL initialization error:', err)
    }
  } else {
    // SQLite schema
    sqliteDb.exec(`
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
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, attendance_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, task_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(task_date);
    `)

    // Seed default Admin user if not present
    const adminExists = sqliteDb.prepare('SELECT id FROM users WHERE role = ?').get('admin')
    if (!adminExists) {
      const adminPasswordHash = bcrypt.hashSync('admin123', 10)
      sqliteDb.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run('admin-1', 'Administrator', 'admin@fusionlabs.com', adminPasswordHash, 'admin')
      console.log('✅ SQLite: Default Admin seeded: admin@fusionlabs.com / admin123')
    }

    // Seed sample employees if no employees present
    const empCount = sqliteDb.prepare('SELECT count(*) as count FROM users WHERE role = ?').get('employee').count
    if (empCount === 0) {
      const emp1Hash = bcrypt.hashSync('employee123', 10)
      sqliteDb.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run('emp-1', 'Alex Morgan', 'alex@fusionlabs.com', emp1Hash, 'employee')

      const emp2Hash = bcrypt.hashSync('employee123', 10)
      sqliteDb.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now', '-30 days'))
      `).run('emp-2', 'Sarah Connor', 'sarah@fusionlabs.com', emp2Hash, 'employee')

      console.log('✅ SQLite: Sample Employees seeded: alex@fusionlabs.com / employee123')
    }
  }
}
