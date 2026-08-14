import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'

export default function App() {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="page-center">
        <div className="loader" />
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          session
            ? <Navigate to={profile?.role === 'admin' ? '/admin' : '/dashboard'} replace />
            : <Home />
        }
      />
      <Route
        path="/login"
        element={
          session
            ? <Navigate to={profile?.role === 'admin' ? '/admin' : '/dashboard'} replace />
            : <Login />
        }
      />
      <Route
        path="/register"
        element={
          session
            ? <Navigate to={profile?.role === 'admin' ? '/admin' : '/dashboard'} replace />
            : <Register />
        }
      />

      {/* Separate admin login */}
      <Route
        path="/admin-login"
        element={
          session && profile?.role === 'admin'
            ? <Navigate to="/admin" replace />
            : session && profile?.role === 'employee'
            ? <Navigate to="/dashboard" replace />
            : <AdminLogin />
        }
      />

      {/* Employee dashboard — employees only */}
      <Route
        path="/dashboard"
        element={
          session && profile?.role === 'employee'
            ? <Dashboard />
            : session && profile?.role === 'admin'
            ? <Navigate to="/admin" replace />
            : <Navigate to="/login" replace />
        }
      />

      {/* Admin dashboard — admin only. Employees are denied and sent to their dashboard. */}
      <Route
        path="/admin"
        element={
          session && profile?.role === 'admin'
            ? <AdminDashboard />
            : session && profile?.role === 'employee'
            ? <Navigate to="/dashboard" replace />
            : <Navigate to="/admin-login" replace />
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
