import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="home-screen">
      <div className="home-card">
        <div style={{ textAlign: 'center' }}>
          <span className="home-brand-badge">⚡ WORKFORCE HUB</span>
        </div>
        <h1 className="home-title">FusionLabs Digital</h1>
        <p className="home-subtitle">Employee Attendance & Task Management</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link to="/login" className="btn btn-primary btn-lg btn-block">
            Employee Login
          </Link>
          <Link to="/register" className="btn btn-outline btn-lg btn-block">
            Create Account
          </Link>
        </div>

        <p className="admin-back">
          Are you an administrator? <Link to="/admin-login">Admin Portal &rarr;</Link>
        </p>
      </div>
    </div>
  )
}
