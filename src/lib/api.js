// FusionLabs REST API Client

const API_BASE = '/api'

function getToken() {
  return localStorage.getItem('fusionlabs_token') || ''
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('fusionlabs_token', token)
  } else {
    localStorage.removeItem('fusionlabs_token')
  }
}

async function request(endpoint, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const config = {
    ...options,
    headers,
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`)
  }

  return data
}

export const api = {
  // Auth
  auth: {
    login: (email, password) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    register: (name, email, password) =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      }),

    me: () => request('/auth/me'),

    changePassword: (newPassword) =>
      request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      }),

    adminResetPassword: (userId, newPassword) =>
      request('/auth/admin-reset-password', {
        method: 'POST',
        body: JSON.stringify({ userId, newPassword }),
      }),
  },

  // Attendance
  attendance: {
    getToday: (date) => request(`/attendance/today${date ? `?date=${date}` : ''}`),

    checkIn: (date) =>
      request('/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify({ date }),
      }),

    checkOut: (date) =>
      request('/attendance/check-out', {
        method: 'POST',
        body: JSON.stringify({ date }),
      }),

    getHistory: () => request('/attendance/history'),

    getAdminDate: (date) => request(`/attendance/admin/date/${date}`),

    getAdminCalendar: (startDate, endDate, userId = 'all') =>
      request(
        `/attendance/admin/calendar?startDate=${startDate}&endDate=${endDate}&userId=${userId}`
      ),
  },

  // Tasks
  tasks: {
    getToday: (date) => request(`/tasks/today${date ? `?date=${date}` : ''}`),

    create: (project_name, task_name, task_date) =>
      request('/tasks', {
        method: 'POST',
        body: JSON.stringify({ project_name, task_name, task_date }),
      }),

    update: (id, updates) =>
      request(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),

    delete: (id) =>
      request(`/tasks/${id}`, {
        method: 'DELETE',
      }),

    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString()
      return request(`/tasks/all${query ? `?${query}` : ''}`)
    },
  },

  // Employees (Admin)
  employees: {
    list: (date) => request(`/employees${date ? `?date=${date}` : ''}`),

    getDetail: (id) => request(`/employees/${id}`),

    delete: (id) =>
      request(`/employees/${id}`, {
        method: 'DELETE',
      }),
  },
}
