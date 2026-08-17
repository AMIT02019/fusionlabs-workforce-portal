import { createContext, useContext, useEffect, useState } from 'react'
import { api, setToken } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadUser() {
    try {
      const token = localStorage.getItem('fusionlabs_token')
      if (!token) {
        setSession(null)
        setProfile(null)
        setLoading(false)
        return
      }

      const res = await api.auth.me()
      if (res?.user) {
        setSession({ user: res.user, token })
        setProfile(res.user)
      } else {
        setToken(null)
        setSession(null)
        setProfile(null)
      }
    } catch {
      setToken(null)
      setSession(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUser()
  }, [])

  function signIn(user, token) {
    setToken(token)
    setSession({ user, token })
    setProfile(user)
  }

  function signOut() {
    setToken(null)
    setSession(null)
    setProfile(null)
  }

  const value = {
    session,
    profile,
    loading,
    setProfile,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
