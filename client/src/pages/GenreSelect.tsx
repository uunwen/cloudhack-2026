import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout'
import Card from '../components/Card'
import Button from '../components/Button'
import LoadingState from '../components/LoadingState'
import { generateScript } from '../lib/api'
import { useParsedContent } from '../lib/ParsedContentContext'
import { useScript } from '../lib/ScriptContext'

const GENRES = [
  { id: 'gossip-podcast', label: 'Gossip Podcast', blurb: 'Casual bestie banter, dramatic reactions, "wait WHAT" energy.' },
  { id: 'true-crime', label: 'True Crime', blurb: 'Slow-burn suspense with an ominous narrator vibe.' },
  { id: 'sports-commentary', label: 'Sports Commentary', blurb: "Play-by-play hype like it's the championship game." },
  { id: 'gen-z-slang', label: 'Gen-Z Slang Explainer', blurb: 'Heavy slang, rizz included, still explains it clearly.' },
  { id: 'reality-tv', label: 'Reality TV Drama', blurb: 'Confessional-cam reactions and messy interpersonal tea.' },
] as const

type Status = 'idle' | 'loading' | 'error'

function GenreSelect() {
  const navigate = useNavigate()
  const { sections } = useParsedContent()
  const { setScript } = useScript()

  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  if (!sections || sections.length === 0) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center gap-8 text-center">
          <h1 className="font-sans text-3xl font-bold text-text-dark">Pick a Genre</h1>
          <Card className="w-full">
            <p className="text-text-dark/70">
              We don't have anything to work with yet — head back and upload something first.
            </p>
          </Card>
          <Button variant="primary" onClick={() => navigate('/upload')}>
            Back to Upload
          </Button>
        </div>
      </PageLayout>
    )
  }

  if (status === 'loading') {
    return (
      <PageLayout>
        <LoadingState message="Cooking up the script..." />
      </PageLayout>
    )
  }

  async function handleGenerate() {
    if (!selectedGenre) return
    setStatus('loading')
    setError(null)
    try {
      const script = await generateScript(sections, selectedGenre)
      setScript(script)
      navigate('/player')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while generating the script.')
      setStatus('error')
    }
  }

  return (
    <PageLayout>
      <div className="flex flex-col items-center gap-8 text-center">
        <h1 className="font-sans text-3xl font-bold text-text-dark">Pick a Genre</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {GENRES.map((genre) => {
            const selected = selectedGenre === genre.id
            return (
              <Card
                key={genre.id}
                onClick={() => setSelectedGenre(genre.id)}
                className={`text-left cursor-pointer transition-shadow ${
                  selected ? 'ring-2 ring-accent-coral' : ''
                }`}
              >
                <p className="font-semibold text-text-dark">{genre.label}</p>
                <p className="text-sm text-text-dark/70 mt-1">{genre.blurb}</p>
              </Card>
            )
          })}
        </div>

        {status === 'error' && error && <p className="text-accent-coral font-sans">{error}</p>}

        <Button variant="primary" onClick={handleGenerate} disabled={!selectedGenre}>
          Generate Episode
        </Button>
      </div>
    </PageLayout>
  )
}

export default GenreSelect
