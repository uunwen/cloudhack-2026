import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown, { type Components } from 'react-markdown'
import Button from '../components/Button'
import Card from '../components/Card'
import PageLayout from '../components/PageLayout'
import {
  askNotes,
  synthesizeChatSpeech,
  type ChatHistoryMessage,
  type ChatResolvedScope,
  type ChatSource,
} from '../lib/api'
import { useParsedContent } from '../lib/ParsedContentContext'
import { useMicRecorder } from '../lib/useMicRecorder'

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 whitespace-pre-wrap last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="underline">
      {children}
    </a>
  ),
}

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

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
      <rect x="5" y="0.5" width="4" height="7" rx="2" />
      <path d="M3 6.5a1 1 0 0 1 2 0 2 2 0 0 0 4 0 1 1 0 0 1 2 0 4 4 0 0 1-3 3.87V12h1.5a1 1 0 0 1 0 2h-5a1 1 0 0 1 0-2H6v-1.63A4 4 0 0 1 3 6.5z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" rx="2" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M3 1.5v13l11-6.5-11-6.5z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="2" y="1" width="4" height="14" rx="1" />
      <rect x="10" y="1" width="4" height="14" rx="1" />
    </svg>
  )
}

function Chat() {
  const navigate = useNavigate()
  const { sections } = useParsedContent()
  const mic = useMicRecorder()
  const messageCounter = useRef(0)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeScope, setActiveScope] = useState<ChatResolvedScope | null>(null)
  const [showMicConsent, setShowMicConsent] = useState(false)

  const [audioCache, setAudioCache] = useState<Record<string, string>>({})
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const chatAudioRef = useRef<HTMLAudioElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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

  async function handleAllowMic() {
    setShowMicConsent(false)
    const granted = await mic.requestAccess()
    if (granted) mic.startRecording()
  }

  async function handleMicButtonClick() {
    if (mic.consentStatus === 'denied') return
    if (mic.consentStatus !== 'granted') {
      setShowMicConsent(true)
      return
    }
    if (mic.isRecording) {
      const text = await mic.stopRecording()
      if (text) setInput(text)
    } else {
      mic.startRecording()
    }
  }

  function playAudioUrl(id: string, url: string) {
    const audio = chatAudioRef.current
    if (!audio) return
    audio.src = url
    audio.play().catch(() => {})
    setPlayingId(id)
  }

  async function handlePlayResponse(message: ChatMessage) {
    if (playingId === message.id) {
      chatAudioRef.current?.pause()
      setPlayingId(null)
      return
    }

    const cached = audioCache[message.id]
    if (cached) {
      playAudioUrl(message.id, cached)
      return
    }

    setAudioLoadingId(message.id)
    try {
      const audioUrl = await synthesizeChatSpeech(message.content)
      setAudioCache((current) => ({ ...current, [message.id]: audioUrl }))
      playAudioUrl(message.id, audioUrl)
    } catch {
      // Playback is a nice-to-have here -- if synthesis fails, the response text is still readable.
    } finally {
      setAudioLoadingId(null)
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

        <audio ref={chatAudioRef} onEnded={() => setPlayingId(null)} className="hidden" />

        <Card className="h-[60vh] flex flex-col p-5 sm:p-8" aria-live="polite">
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4">
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
                      className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm font-sans ${
                        message.role === 'user'
                          ? 'whitespace-pre-wrap bg-accent-coral text-white'
                          : 'bg-background-cream text-text-dark'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
                      ) : (
                        message.content
                      )}
                    </div>
                    {message.role === 'assistant' && (
                      <button
                        type="button"
                        onClick={() => handlePlayResponse(message)}
                        aria-label={playingId === message.id ? 'Stop playback' : 'Play response'}
                        className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary-yellow text-text-dark hover:opacity-80"
                      >
                        {audioLoadingId === message.id ? (
                          <SpinnerIcon />
                        ) : playingId === message.id ? (
                          <PauseIcon />
                        ) : (
                          <PlayIcon />
                        )}
                      </button>
                    )}
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
            <div ref={bottomRef} />
          </div>
        </Card>

        {showMicConsent && (
          <Card className="flex flex-col gap-3 p-4 text-sm text-text-dark sm:flex-row sm:items-center">
            <p className="flex-1">
              Lore Drop records your voice locally to transcribe your question. Nothing is stored.
            </p>
            <div className="flex flex-shrink-0 gap-2">
              <Button variant="primary" onClick={handleAllowMic}>
                Allow microphone
              </Button>
              <Button variant="secondary" onClick={() => setShowMicConsent(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="flex flex-shrink-0 flex-col gap-3">
          <label htmlFor="chat-question" className="sr-only">
            Ask a question about your notes
          </label>
          <div className="flex items-start gap-2">
            <textarea
              id="chat-question"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about a chapter, page, section, or topic..."
              rows={3}
              maxLength={2000}
              disabled={loading}
              className="w-full flex-1 resize-none rounded-2xl border border-primary-yellow bg-white p-4 font-sans text-text-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-coral disabled:opacity-60"
            />
            <button
              type="button"
              onClick={handleMicButtonClick}
              disabled={mic.consentStatus === 'denied' || mic.isTranscribing}
              aria-label={mic.isRecording ? 'Stop recording' : 'Record a question'}
              className={`relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                mic.isRecording
                  ? 'bg-accent-coral text-white'
                  : mic.consentStatus === 'denied'
                    ? 'cursor-not-allowed bg-background-cream text-text-dark/30'
                    : 'bg-primary-yellow text-text-dark hover:opacity-80'
              }`}
            >
              {mic.isTranscribing ? <SpinnerIcon /> : mic.isRecording ? <StopIcon /> : <MicIcon />}
              {mic.isRecording && (
                <span className="absolute -top-0.5 -right-0.5 h-3 w-3 animate-pulse rounded-full bg-red-500" />
              )}
            </button>
          </div>
          {mic.consentStatus === 'denied' && (
            <p className="text-xs text-text-dark/50">Microphone access was blocked.</p>
          )}
          {mic.error && <p className="text-xs text-accent-coral">{mic.error}</p>}
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
