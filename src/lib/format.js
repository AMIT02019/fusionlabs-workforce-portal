// Formatting helpers shared across the app.

function parseLocalDate(d) {
  if (!d) return new Date()
  if (d instanceof Date) return d
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return new Date(d + 'T00:00:00')
  }
  return new Date(d)
}

// "Friday, 14 August 2026"
export function formatLongDate(d) {
  const date = parseLocalDate(d)
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// "14 Aug"
export function formatShortDate(d) {
  const date = parseLocalDate(d)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// "Friday"
export function formatDay(d) {
  const date = parseLocalDate(d)
  return date.toLocaleDateString('en-GB', { weekday: 'long' })
}

// "09:32 AM"
export function formatTime(t) {
  if (!t) return null
  const date = t instanceof Date ? t : new Date(t)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

// "9h 15m"
export function formatDuration(minutes) {
  if (minutes == null) return null
  const m = Math.round(Number(minutes))
  if (Number.isNaN(m) || m < 1) return '0m'
  const h = Math.floor(m / 60)
  const rem = m % 60
  if (h === 0) return `${rem}m`
  if (rem === 0) return `${h}h`
  return `${h}h ${rem}m`
}

// YYYY-MM-DD in local time (used as the attendance/task date key)
export function dateKey(d) {
  const date = parseLocalDate(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Status based on working minutes: PRESENT (>=540), HALF DAY (>=240), ABSENT (<240)
export function attendanceStatus(workingMinutes) {
  const m = Number(workingMinutes)
  if (m >= 540) return 'PRESENT'
  if (m >= 240) return 'HALF DAY'
  return 'ABSENT'
}

// Task duration: end - start in minutes
export function minutesBetween(start, end) {
  if (!start || !end) return null
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return null
  return Math.round((e - s) / 60000)
}
