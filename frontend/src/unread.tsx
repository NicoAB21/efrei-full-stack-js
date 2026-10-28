/* eslint-disable react-refresh/only-export-components -- Contexte et hook des messages non lus. */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './auth'
import { fetchUnread } from './messages'

// Pastille des messages non lus : relue toutes les 30 s, au retour sur l'onglet, et après une lecture ou un envoi.
const POLL_MS = 30_000

type Unread = { count: number; refresh: () => void }
const UnreadContext = createContext<Unread>({ count: 0, refresh: () => {} })

export function UnreadProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [count, setCount] = useState(0)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!user) return
    let active = true
    const load = () => fetchUnread().then((n) => { if (active) setCount(n) }).catch(() => {})
    load()
    const timer = setInterval(load, POLL_MS)
    window.addEventListener('focus', load)
    return () => {
      active = false
      clearInterval(timer)
      window.removeEventListener('focus', load)
    }
  }, [user, version])

  return (
    <UnreadContext.Provider value={{ count: user ? count : 0, refresh: () => setVersion((v) => v + 1) }}>
      {children}
    </UnreadContext.Provider>
  )
}

export const useUnread = () => useContext(UnreadContext)
