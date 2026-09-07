import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import PageLayout from '../components/PageLayout'
import {
  askNotes,
  type ChatHistoryMessage,
  type ChatResolvedScope,
  type ChatSource,
} from '../lib/api'
import { useParsedContent } from '../lib/ParsedContentContext'

interface ChatMessage extends ChatHistoryMessage {
  id: string
  sources?: ChatSource[]
}

const STARTER_PROMPTS = [
  'Summarize my notes',
  'What are the key concepts?',
  'Quiz me on this material',
  'Explain the hardest topic simply',
]

function sourceLabel(source: ChatSource) {
  if (source.label) return source.label

  const parts = []
  if (source.sourceName) parts.push(source.sourceName)
  if (source.pageNumber != null) parts.push(`Page ${source.pageNumber}`)
  else if (source.slideNumber != null) parts.push(`Slide ${source.slideNumber}`)
  else if (source.headingPath?.length) parts.push(source.headingPath.at(-1)!)
  else if (source.sectionTitle) parts.push(source.sectionTitle)
  return parts.join(' · ') || 'Uploaded material'
}

function Chat() {
  const navigate = useNavigate()
  const { sections } = useParsedContent()
  const messageCounter = useRef(0)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeScope, setActiveScope] = useState<ChatResolvedScope | null>(null)

  function nextMessageId(role: ChatMessage['role']) {
    messageCounter.current += 1
    return `${role}-${messageCounter.current}`
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const question = input.trim()
    if (!question || loading || !sections?.length) return

    const recentHistory = messages.slice(-6).map(({ role, content }) => ({ role, content }))
    const userMessage: ChatMessage = { id: nextMessageId('user'), role: 'user', content: question }

    setMessages((current) => [...current, userMessage])
    setInput('')
    setError(null)
    setLoading(true)

    try {
      const response = await askNotes({
        question,
        sections,
        history: recentHistory,
        activeScope,
      })
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId('assistant'),
          role: 'assistant',
          content: response.answer,
          sources: response.sources,
        },
      ])
      if (response.resolvedScope) setActiveScope(response.resolvedScope)
    } catch {
      setError('Something went wrong while checking your notes. Please try again.')
      setInput(question)
    } finally {
      setLoading(false)
    }
  }

  if (!sections?.length) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="font-sans text-3xl font-bold text-text-dark">Ask Your Notes</h1>
          <Card className="w-full">
            <p className="font-semibold text-text-dark">No study material loaded.</p>
            <p className="mt-2 text-sm text-text-dark/70">Upload notes first so answers can stay grounded in your material.</p>
          </Card>
          <Button variant="primary" onClick={() => navigate('/upload')}>
            Go to Upload
          </Button>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h1 className="font-sans text-3xl font-bold text-text-dark">Ask Your Notes</h1>
          <p className="mt-2 text-sm text-text-dark/70">
            Answers use only your uploaded study material and show where they came from.
          </p>
        </div>

        <Card className="min-h-96 flex flex-col gap-4 p-5 sm:p-8" aria-live="polite">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
              <div>
                <p className="font-semibold text-text-dark">Ask anything about your uploaded material.</p>
                <p className="mt-1 text-sm text-text-dark/60">Try a chapter, page, section, or topic.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="rounded-full bg-primary-yellow px-4 py-2 text-sm font-semibold text-text-dark transition-opacity hover:opacity-80"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const labels = [...new Set((message.sources || []).map(sourceLabel))]
              return (
                <div
                  key={message.id}
                  className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                      message.role === 'user'
                        ? 'bg-accent-coral text-white'
                        : 'bg-background-cream text-text-dark'
                    }`}
                  >
                    {message.content}
                  </div>
                  {labels.length > 0 && (
                    <div className="mt-2 flex max-w-[88%] flex-wrap gap-2">
                      {labels.map((label) => (
                        <span
                          key={label}
                          className="rounded-full border border-primary-yellow px-3 py-1 text-xs text-text-dark/70"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}

          {loading && (
            <div className="flex items-start">
              <div className="rounded-2xl bg-background-cream px-4 py-3 text-sm text-text-dark/70">
                Checking your notes...
              </div>
            </div>
          )}
        </Card>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label htmlFor="chat-question" className="sr-only">
            Ask a question about your notes
          </label>
          <textarea
            id="chat-question"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about a chapter, page, section, or topic..."
            rows={3}
            maxLength={2000}
            disabled={loading}
            className="w-full resize-none rounded-2xl border border-primary-yellow bg-white p-4 font-sans text-text-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-coral disabled:opacity-60"
          />
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-accent-coral" role="alert">
              {error}
            </p>
            <Button type="submit" variant="primary" disabled={!input.trim() || loading}>
              {loading ? 'Checking...' : 'Send'}
            </Button>
          </div>
        </form>
      </div>
    </PageLayout>
  )
}

export default Chat
