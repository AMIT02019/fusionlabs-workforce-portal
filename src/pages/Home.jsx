import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { ensureAdminAccount } from '../lib/admin'

export default function Home() {
  useEffect(() => {
    ensureAdminAccount()
  }, [])

  return (
    <div className="home-screen">
      <div className="home-card">
        <h1 className="home-title">FusionLabs Digital</h1>
        <p className="home-subtitle">Employee Management System</p>
        <Link to="/login" className="btn btn-primary btn-lg">Login</Link>
        <Link to="/admin-login" className="admin-back" style={{ display: 'block', marginTop: '20px' }}>
          Admin login
        </Link>
      </div>
    </div>
  )
}
