import type { ParsedSection } from './ParsedContentContext'
import type { ScriptLine, AudioScriptLine, QuizQuestion } from './ScriptContext'

export type { QuizQuestion }

const API_BASE_URL = 'http://localhost:3001'

const NETWORK_ERROR_MESSAGE = "Couldn't reach the server. Check your connection and try again."

async function safeFetch(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init)
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE)
  }
}

export interface FailedFile {
  name: string
  error: string
}

export interface ParseResult {
  sections: ParsedSection[]
  failedFiles: FailedFile[]
}

export async function parseContent(input: { files: File[]; text: string }): Promise<ParseResult> {
  const formData = new FormData()
  input.files.forEach((file) => formData.append('files', file))
  if (input.text.trim()) {
    formData.append('text', input.text)
  }

  const response = await safeFetch(`${API_BASE_URL}/api/parse`, {
    method: 'POST',
    body: formData,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data ? data.error : 'Something went wrong while parsing your content.'
    throw new Error(message)
  }

  if (Array.isArray(data)) {
    return { sections: data as ParsedSection[], failedFiles: [] }
  }

  if (data && typeof data === 'object' && Array.isArray(data.sections)) {
    return { sections: data.sections as ParsedSection[], failedFiles: data.failedFiles ?? [] }
  }

  throw new Error('Something went wrong while parsing your content.')
}

export async function generateScript(sections: ParsedSection[], genre: string): Promise<ScriptLine[]> {
  const response = await safeFetch(`${API_BASE_URL}/api/generate-script`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sections, genre }),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok || !Array.isArray(data)) {
    const message = data && typeof data === 'object' && 'error' in data ? data.error : 'Something went wrong while generating the script.'
    throw new Error(message)
  }

  return data as ScriptLine[]
}

export async function generateAudio(script: ScriptLine[]): Promise<AudioScriptLine[]> {
  const response = await safeFetch(`${API_BASE_URL}/api/generate-audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script }),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok || !Array.isArray(data)) {
    const message = data && typeof data === 'object' && 'error' in data ? data.error : 'Something went wrong while generating audio.'
    throw new Error(message)
  }

  return data as AudioScriptLine[]
}

export async function generateSummary(sections: ParsedSection[]): Promise<string> {
  const response = await safeFetch(`${API_BASE_URL}/api/generate-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sections }),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok || !data || typeof data.summary !== 'string') {
    const message = data && typeof data === 'object' && 'error' in data ? data.error : 'Something went wrong while generating the summary.'
    throw new Error(message)
  }

  return data.summary as string
}

export async function generateQuiz(sections: ParsedSection[]): Promise<QuizQuestion[]> {
  const response = await safeFetch(`${API_BASE_URL}/api/generate-quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sections }),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok || !Array.isArray(data)) {
    const message = data && typeof data === 'object' && 'error' in data ? data.error : 'Something went wrong while generating the quiz.'
    throw new Error(message)
  }

  return data as QuizQuestion[]
}
