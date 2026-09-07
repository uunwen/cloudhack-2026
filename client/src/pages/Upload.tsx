import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout'
import Card from '../components/Card'
import Button from '../components/Button'
import LoadingState from '../components/LoadingState'
import { parseContent, type ParseResult } from '../lib/api'
import { useParsedContent } from '../lib/ParsedContentContext'
import { useScript } from '../lib/ScriptContext'

type Status = 'idle' | 'loading' | 'success' | 'error'

// Pre-generated backup episodes -- a live-demo safety net for when wifi or the API is slow
// or flaky. Loading one skips every /api/generate-* call entirely (see ScriptContext's
// `preloaded` field, consumed by Player.tsx and Quiz.tsx).
const DEMO_EPISODES = [
  { slug: 'gossip-podcast', label: 'Gossip Podcast' },
  { slug: 'true-crime', label: 'True Crime' },
  { slug: 'gen-z-slang', label: 'Gen-Z Slang' },
] as const

function Upload() {
  const navigate = useNavigate()
  const { setSections } = useParsedContent()
  const { setScript, setPreloaded } = useScript()

  const [files, setFiles] = useState<File[]>([])
  const [text, setText] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ParseResult | null>(null)

  const canSubmit = files.length > 0 || text.trim().length > 0

  function handleFilesChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? [])
    setFiles((prev) => [...prev, ...chosen])
    e.target.value = ''
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    setStatus('loading')
    setError(null)
    try {
      const parsed = await parseContent({ files, text })
      setResult(parsed)
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while parsing your content.')
      setStatus('error')
    }
  }

  async function handleLoadDemo(slug: string) {
    setStatus('loading')
    setError(null)
    try {
      const response = await fetch(`/demo-episodes/${slug}.json`)
      if (!response.ok) throw new Error('Could not load that demo episode.')
      const bundle = await response.json()
      setSections(bundle.sections)
      setScript(bundle.script)
      setPreloaded({ audioScript: bundle.audioScript, summary: bundle.summary, quiz: bundle.quiz })
      navigate('/player')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load that demo episode.')
      setStatus('error')
    }
  }

  function handleContinue() {
    if (!result) return
    setSections(result.sections)
    navigate('/genre-select')
  }

  function summaryText() {
    if (!result) return ''
    const fileCount = files.length
    const hasText = text.trim().length > 0
    const sectionCount = result.sections.length
    const sectionWord = sectionCount === 1 ? 'section' : 'sections'

    if (fileCount > 0 && hasText) {
      return `Parsed ${fileCount} file${fileCount === 1 ? '' : 's'} and your notes into ${sectionCount} ${sectionWord}.`
    }
    if (fileCount > 0) {
      return `Parsed ${fileCount} file${fileCount === 1 ? '' : 's'} into ${sectionCount} ${sectionWord}.`
    }
    return `Parsed your notes into ${sectionCount} ${sectionWord}.`
  }

  if (status === 'loading') {
    return (
      <PageLayout>
        <LoadingState message="Reading your slides..." />
      </PageLayout>
    )
  }

  if (status === 'success' && result) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center gap-8 text-center">
          <h1 className="font-sans text-3xl font-bold text-text-dark">Upload</h1>
          <Card className="w-full text-left">
            <p className="font-semibold text-text-dark mb-3">{summaryText()}</p>
            <ul className="list-disc list-inside text-text-dark/70 space-y-1">
              {result.sections.slice(0, 2).map((section, i) => (
                <li key={i}>{section.sectionTitle}</li>
              ))}
            </ul>
            {result.failedFiles.length > 0 && (
              <div className="mt-4 pt-4 border-t border-primary-yellow">
                <p className="text-accent-coral text-sm font-semibold mb-1">Couldn't read everything:</p>
                <ul className="text-accent-coral text-sm space-y-1">
                  {result.failedFiles.map((f, i) => (
                    <li key={i}>
                      {f.name} — {f.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
          <Button variant="primary" onClick={handleContinue}>
            Continue
          </Button>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="flex flex-col items-center gap-8 text-center">
        <h1 className="font-sans text-3xl font-bold text-text-dark">Upload</h1>

        <Card className="w-full flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3">
            <label className="cursor-pointer rounded-2xl bg-primary-yellow px-6 py-3 font-sans font-semibold text-text-dark">
              Choose files
              <input
                type="file"
                multiple
                accept=".pdf,.pptx,.docx,image/png,image/jpeg"
                className="hidden"
                onChange={handleFilesChosen}
              />
            </label>
            {files.length === 0 ? (
              <p className="text-text-dark/70 text-sm">PDF, PPTX, DOCX, or images (PNG/JPG)</p>
            ) : (
              <ul className="w-full flex flex-col gap-2 text-left">
                {files.map((file, i) => (
                  <li
                    key={`${file.name}-${i}`}
                    className="flex items-center justify-between rounded-xl bg-background-cream px-4 py-2"
                  >
                    <span className="text-text-dark text-sm truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      aria-label={`Remove ${file.name}`}
                      className="text-text-dark/50 hover:text-accent-coral font-bold px-2"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="text-left">
            <label className="block text-sm font-semibold text-text-dark mb-2">
              Additional notes (optional)
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste any extra text here..."
              rows={4}
              className="w-full resize-none rounded-2xl border border-primary-yellow p-4 font-sans text-text-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-coral"
            />
          </div>
        </Card>

        {status === 'error' && error && <p className="text-accent-coral font-sans">{error}</p>}

        <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
          Parse & Continue
        </Button>

        <p className="text-xs text-text-dark/50 font-sans">
          Or jump straight to a demo episode:{' '}
          {DEMO_EPISODES.map((demo, i) => (
            <span key={demo.slug}>
              <button
                type="button"
                onClick={() => handleLoadDemo(demo.slug)}
                className="underline hover:text-accent-coral"
              >
                {demo.label}
              </button>
              {i < DEMO_EPISODES.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </p>
      </div>
    </PageLayout>
  )
}

export default Upload
