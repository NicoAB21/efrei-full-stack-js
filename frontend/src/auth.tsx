/* eslint-disable react-refresh/only-export-components -- Contexte et hook d'authentification partagés. */
import { createContext, useContext, useState, type ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router'
import { apiFetch, clearToken, getToken, setToken } from './api'

type User = { id: string; email: string }
type Session = { user: User; token: string }
type Credentials = { email: string; password: string }
type Auth = {
  user: User | null
  token: string | null
  login: (credentials: Credentials) => Promise<void>
  register: (credentials: Credentials) => Promise<void>
  logout: () => void
}
const USER_KEY = 'occaz.user'
const AuthContext = createContext<Auth | null>(null)

function restoreSession(): Session | null {
  try {
    const token = getToken()
    const user = JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') as User | null
    if (token && user && typeof user.id === 'string' && typeof user.email === 'string') return { user, token }
  } catch { /* Une session illisible doit simplement être supprimée. */ }
  clearToken()
  localStorage.removeItem(USER_KEY)
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(restoreSession)
  async function authenticate(route: 'login' | 'register', credentials: Credentials) {
    const next = await apiFetch<Session>(`/auth/${route}`, { method: 'POST', body: JSON.stringify(credentials) })
    setToken(next.token)
    localStorage.setItem(USER_KEY, JSON.stringify(next.user))
    setSession(next)
  }
  function logout() {
    clearToken()
    localStorage.removeItem(USER_KEY)
    setSession(null)
  }
  return <AuthContext.Provider value={{ user: session?.user ?? null, token: session?.token ?? null,
    login: (credentials) => authenticate('login', credentials),
    register: (credentials) => authenticate('register', credentials), logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return auth
}

export function RequireAuth() {
  const { user, token } = useAuth()
  return user && token ? <Outlet /> : <Navigate to="/login" replace />
}
