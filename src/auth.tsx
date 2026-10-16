import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import * as api from './api'
import type { User } from './api'

type AuthContextValue = {
  user: User | null
  // True while the user is being loaded from a saved token on startup.
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => api.getToken() !== null)
  const navigate = useNavigate()
  const location = useLocation()

  // A 401 on an authenticated request, or a 403 because the account is banned, clears the token
  // (in api.ts) and sends the user to login, which shows the ban reason if there is one.
  useEffect(() => {
    api.setUnauthorizedHandler((banReason) => {
      setUser(null)
      if (location.pathname !== '/login' || banReason !== undefined) {
        navigate('/login', { state: { from: location, banReason } })
      }
    })
  }, [navigate, location])

  useEffect(() => {
    if (!api.getToken()) return
    api
      .getMe()
      .then(setUser)
      .catch(() => {
        // A 401 is already handled; other errors leave the user logged out for now.
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password)
    api.setToken(result.token)
    setUser(result.user)
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const result = await api.register(name, email, password)
    api.setToken(result.token)
    setUser(result.user)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // The token is cleared locally either way.
    }
    api.setToken(null)
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
