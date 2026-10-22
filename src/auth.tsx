import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import * as api from './api'
import type { User } from './api'

type AuthContextValue = {
  user: User | null
  // True while /me tells who is logged in (by the session cookie) on startup.
  loading: boolean
  login: (email: string, password: string, remember: boolean) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  // A 401 (or a second 419) on a request made while logged in, or a 403 because the account is
  // banned, clears the user and sends them to login, which shows the ban reason if there is one.
  useEffect(() => {
    api.setUnauthorizedHandler((banReason) => {
      setUser(null)
      if (location.pathname !== '/login' || banReason !== undefined) {
        // Login shows the ban reason, or else "Your session has ended".
        navigate('/login', { state: { from: location, banReason, sessionEnded: banReason === undefined } })
      }
    })
  }, [navigate, location])

  // The session cookie is HttpOnly, so only the server knows whether someone is logged in.
  useEffect(() => {
    api
      .getMe()
      .then(setUser)
      .catch(() => {
        // A guest (401) or an error: logged out for now.
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const result = await api.login(email, password, remember)
    setUser(result.user)
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const result = await api.register(name, email, password)
    setUser(result.user)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // Logged out here either way (the session may already have ended).
    }
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    setUser(await api.getMe())
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// The hook lives next to its provider on purpose; fast refresh reloads this file fully.
// oxlint-disable-next-line react/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
