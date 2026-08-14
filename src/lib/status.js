// Shared attendance status helpers.
// PRESENT = GREEN, HALF DAY = YELLOW, ABSENT = RED everywhere.

export function statusClass(status) {
  if (status === 'PRESENT') return 'status-present'
  if (status === 'HALF DAY') return 'status-halfday'
  if (status === 'ABSENT') return 'status-absent'
  return 'status-none'
}

// Calendar cell class for a given status
export function calCellClass(status) {
  if (status === 'PRESENT') return 'cal-present'
  if (status === 'HALF DAY') return 'cal-halfday'
  if (status === 'ABSENT') return 'cal-absent'
  return ''
}

export function calDotClass(status) {
  if (status === 'PRESENT') return 'dot-present'
  if (status === 'HALF DAY') return 'dot-halfday'
  if (status === 'ABSENT') return 'dot-absent'
  return ''
}

export const TASK_STATUS_COLORS = {
  Completed: 'task-completed',
  'Half Done': 'task-halfdone',
  'Not Done': 'task-notdone',
}
