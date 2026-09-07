import { createContext, useContext, useState, type ReactNode } from 'react'

export interface ParsedSection {
  sectionTitle: string
  bodyText: string
  notes: string | null
}

interface ParsedContentContextValue {
  sections: ParsedSection[] | null
  setSections: (sections: ParsedSection[] | null) => void
}

const ParsedContentContext = createContext<ParsedContentContextValue | undefined>(undefined)

export function ParsedContentProvider({ children }: { children: ReactNode }) {
  const [sections, setSections] = useState<ParsedSection[] | null>(null)

  return (
    <ParsedContentContext.Provider value={{ sections, setSections }}>
      {children}
    </ParsedContentContext.Provider>
  )
}

export function useParsedContent() {
  const context = useContext(ParsedContentContext)
  if (!context) {
    throw new Error('useParsedContent must be used within a ParsedContentProvider')
  }
  return context
}
