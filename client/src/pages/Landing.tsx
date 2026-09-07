import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout'
import Card from '../components/Card'
import Button from '../components/Button'

const FEATURES = [
  { emoji: '📤', title: 'Upload', blurb: 'Drop in your slides, notes, or a doc.' },
  { emoji: '🎭', title: 'Genre', blurb: 'Pick the vibe — drama, comedy, true crime.' },
  { emoji: '🎧', title: 'Listen', blurb: 'Get a gossip podcast made from your lore.' },
]

function Landing() {
  const navigate = useNavigate()

  return (
    <PageLayout>
      <div className="flex flex-col gap-16">
        <div className="relative flex flex-col items-center gap-6 text-center py-8">
          <div
            aria-hidden="true"
            className="absolute -top-10 -left-6 h-40 w-40 rounded-full bg-primary-yellow opacity-60 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-6 -right-4 h-48 w-48 rounded-full bg-accent-coral opacity-30 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute top-10 right-10 h-24 w-24 rounded-full bg-primary-yellow opacity-40 blur-2xl"
          />

          <img
            src="/LoreDrop-hero.png"
            alt="Lore Drop mascot"
            className="relative w-56 sm:w-64 h-auto"
          />

          <h1 className="relative font-sans text-4xl font-bold text-text-dark leading-tight">
            Your lectures, but make it drama 🍵
          </h1>
          <p className="relative text-text-dark/70 max-w-md">
            Upload your slides or notes and we'll turn them into a gossip podcast you'll actually
            want to listen to. Spill the syllabus tea, one episode at a time ✨
          </p>
          <Button variant="primary" onClick={() => navigate('/upload')} className="relative">
            Try Lore Drop
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="text-center">
              <div className="text-3xl mb-2">{feature.emoji}</div>
              <p className="font-semibold text-text-dark">{feature.title}</p>
              <p className="text-sm text-text-dark/70 mt-1">{feature.blurb}</p>
            </Card>
          ))}
        </div>
      </div>
    </PageLayout>
  )
}

export default Landing
