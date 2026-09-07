import { createContext, useContext, useState, type ReactNode } from 'react'

export interface ScriptLine {
  speaker: 'A' | 'B'
  text: string
}

export interface AudioScriptLine extends ScriptLine {
  audioUrl: string
}

export interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
}

export interface PreloadedEpisode {
  audioScript: AudioScriptLine[]
  summary: string
  quiz: QuizQuestion[]
}

interface ScriptContextValue {
  script: ScriptLine[] | null
  setScript: (script: ScriptLine[] | null) => void
  preloaded: PreloadedEpisode | null
  setPreloaded: (preloaded: PreloadedEpisode | null) => void
}

const ScriptContext = createContext<ScriptContextValue | undefined>(undefined)

export function ScriptProvider({ children }: { children: ReactNode }) {
  const [script, setScript] = useState<ScriptLine[] | null>(null)
  const [preloaded, setPreloaded] = useState<PreloadedEpisode | null>(null)

  return (
    <ScriptContext.Provider value={{ script, setScript, preloaded, setPreloaded }}>
      {children}
    </ScriptContext.Provider>
  )
}

export function useScript() {
  const context = useContext(ScriptContext)
  if (!context) {
    throw new Error('useScript must be used within a ScriptProvider')
  }
  return context
}
