import { createContext, useContext, useState, type ReactNode } from 'react'

interface SessionStatsContextValue {
  caughtCount: number
  incrementCaughtCount: () => void
  focusSeconds: number
  addFocusSeconds: (delta: number) => void
  resetSessionStats: () => void
}

const SessionStatsContext = createContext<SessionStatsContextValue | undefined>(undefined)

export function SessionStatsProvider({ children }: { children: ReactNode }) {
  const [caughtCount, setCaughtCount] = useState(0)
  const [focusSeconds, setFocusSeconds] = useState(0)

  function incrementCaughtCount() {
    setCaughtCount((c) => c + 1)
  }

  function addFocusSeconds(delta: number) {
    setFocusSeconds((s) => s + delta)
  }

  function resetSessionStats() {
    setCaughtCount(0)
    setFocusSeconds(0)
  }

  return (
    <SessionStatsContext.Provider
      value={{ caughtCount, incrementCaughtCount, focusSeconds, addFocusSeconds, resetSessionStats }}
    >
      {children}
    </SessionStatsContext.Provider>
  )
}

export function useSessionStats() {
  const context = useContext(SessionStatsContext)
  if (!context) {
    throw new Error('useSessionStats must be used within a SessionStatsProvider')
  }
  return context
}
