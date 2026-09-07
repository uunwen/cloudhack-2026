import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout'
import Card from '../components/Card'
import Button from '../components/Button'

const EXCUSES = [
  { line: "I'll study after dinner.", followUp: "Three hours later, still hasn't opened it." },
  { line: 'One TikTok won\'t hurt.', followUp: 'Forty seven TikToks later.' },
  { line: "I'll just skim the slides.", followUp: 'Retains absolutely nothing.' },
]

const DIALOGUE_SNIPPET: { speaker: 'A' | 'B'; text: string }[] = [
  { speaker: 'A', text: 'Okay so basically, mitochondria is doing way too much.' },
  { speaker: 'B', text: "Literally. She's carrying the entire cell financially." },
  { speaker: 'A', text: "Because ATP production, that's her full time job." },
  { speaker: 'B', text: "And don't forget the electron transport chain. That's where things get messy." },
]

const GENRES = [
  { name: 'Gossip Podcast', example: 'Girl, you are not going to believe what happened in the cell membrane.' },
  { name: 'True Crime', example: 'At eleven forty three PM, ATP production mysteriously stopped.' },
  { name: 'Sports Commentary', example: 'And the electron just enters the chain. What a play.' },
  { name: 'Gen Z Explainer', example: "Okay bestie, here's what's actually going on." },
  { name: 'Reality TV', example: 'The mitochondria has officially had enough.' },
]

const TIMELINE_STEPS = [
  { number: '01', title: 'Upload', description: 'Drop your slides, notes, readings, photos, or docs.' },
  { number: '02', title: 'Spill the tea', description: 'Pick your genre. Lore Drop rewrites the material into a two host episode.' },
  { number: '03', title: 'Press play', description: 'Listen with synced transcripts, speed controls, and summaries.' },
  { number: '04', title: 'Get caught', description: 'Look away too long. We know.' },
  { number: '05', title: 'The receipts', description: 'Take the lightning quiz and see whether you actually remembered anything.' },
]

const QUIZ_OPTIONS = ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi apparatus']

const RECEIPTS = ['4 out of 5', '18 minutes focused', '2 times caught slipping', '80 percent retained']

const CONFESSIONS = [
  { quote: 'I opened my lecture slides and immediately fell asleep.', attribution: 'every student ever' },
  { quote: "I told myself I'd start studying last week.", attribution: 'also me' },
  { quote: 'I have twelve unread lecture recordings.', attribution: 'no comment' },
  { quote: 'I understand the topic until the lecturer asks a question.', attribution: 'devastating' },
]

function Panel({ children, tinted }: { children: ReactNode; tinted?: boolean }) {
  return (
    <div className={tinted ? 'bg-white/50 rounded-3xl p-8' : ''}>
      <div className="max-w-3xl mx-auto">{children}</div>
    </div>
  )
}

function HeroSection() {
  const navigate = useNavigate()

  function scrollToTimeline() {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
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

      <p className="relative text-sm font-bold text-accent-coral">
        The study tool you didn't know you needed
      </p>

      <img src="/LoreDrop-hero.png" alt="Lore Drop mascot" className="relative w-56 sm:w-64 h-auto" />

      <h1 className="relative font-display text-4xl sm:text-5xl font-semibold text-text-dark leading-tight">
        Studying was already boring.
        <br />
        So we added the gossip.
      </h1>
      <p className="relative font-sans text-text-dark/70 max-w-[420px]">
        You could stare at your lecture slides for another three hours. Or let Lore Drop turn them
        into a podcast worth actually listening to.
      </p>
      <Button variant="primary" onClick={() => navigate('/upload')} className="relative">
        Spill my lectures
      </Button>
      <button
        type="button"
        onClick={scrollToTimeline}
        className="relative text-sm font-sans text-text-dark/60 hover:text-accent-coral hover:underline"
      >
        See how it works
      </button>
    </div>
  )
}

function BeSoFrSection() {
  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <h2 className="font-display text-3xl font-semibold text-text-dark">Be so fr.</h2>
      <p className="font-sans text-text-dark/70 max-w-2xl">
        Has studying ever been so painfully boring that you would rather reorganize your entire
        Spotify playlist than open your lecture slides.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        {EXCUSES.map((excuse) => (
          <Card key={excuse.line} className="text-center">
            <p className="font-semibold text-text-dark">{excuse.line}</p>
            <p className="text-sm text-text-dark/50 mt-1">{excuse.followUp}</p>
          </Card>
        ))}
      </div>
      <p className="font-sans text-text-dark/70 max-w-2xl">
        Yeah. We know. Lore Drop takes the stuff you're supposed to study and turns it into
        something your brain actually wants to consume.
      </p>
    </div>
  )
}

function BeforeAfterSection() {
  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <h2 className="font-display text-3xl font-semibold text-text-dark">
        Your lecture has lore. We found it.
      </h2>

      <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-8 w-full">
        <Card className="text-left">
          <p className="text-xs font-bold text-text-dark/50 mb-3">Before</p>
          <p className="font-mono text-sm text-text-dark/80 leading-relaxed">
            Biology 101. Mitochondria. Produces ATP. Double membrane structure. Inner membrane
            contains ETC. Oxidative phosphorylation. Krebs cycle.
          </p>
        </Card>

        <p className="sm:hidden text-sm italic text-text-dark/50">becomes</p>

        <Card className="text-left flex flex-col gap-3">
          <p className="text-xs font-bold text-accent-coral mb-1">After</p>
          {DIALOGUE_SNIPPET.map((line, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className={`flex-shrink-0 h-7 w-7 rounded-full text-white flex items-center justify-center font-sans font-bold text-xs ${
                  line.speaker === 'A' ? 'bg-accent-coral' : 'bg-text-dark'
                }`}
              >
                {line.speaker}
              </div>
              <p className="text-sm text-text-dark pt-1">{line.text}</p>
            </div>
          ))}
        </Card>

        <span className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-24 items-center justify-center rounded-full border border-primary-yellow bg-background-cream text-sm italic text-text-dark/60">
          becomes
        </span>
      </div>

      <p className="text-sm italic text-text-dark/50">Same facts. Less suffering.</p>
    </div>
  )
}

function GenreShowcaseSection() {
  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <h2 className="font-display text-3xl font-semibold text-text-dark">
        Choose your flavor of academic chaos.
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 w-full">
        {GENRES.map((genre) => (
          <Card key={genre.name} className="text-center">
            <p className="font-semibold text-text-dark text-sm">{genre.name}</p>
            <p className="text-xs italic text-text-dark/60 mt-2">{genre.example}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

function HowItWorksSection() {
  return (
    <div id="how-it-works" className="flex flex-col items-center gap-12 text-center scroll-mt-8">
      <h2 className="font-display text-3xl font-semibold text-text-dark max-w-2xl">
        From ugh I have to study to wait this is actually kind of fun.
      </h2>

      <div className="relative flex flex-col sm:flex-row gap-8 sm:gap-4 w-full">
        <div
          aria-hidden="true"
          className="hidden sm:block absolute top-5 left-0 right-0 h-px bg-primary-yellow"
        />
        {TIMELINE_STEPS.map((step) => (
          <div key={step.number} className="relative flex-1 flex flex-col items-center gap-2">
            <div className="relative z-10 h-10 w-10 rounded-full bg-accent-coral text-white flex items-center justify-center font-display font-semibold text-sm">
              {step.number}
            </div>
            <p className="font-semibold text-text-dark">{step.title}</p>
            <p className="text-sm text-text-dark/70">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function CaughtLackingSection() {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h2 className="font-display text-3xl font-semibold text-text-dark">Caught lacking?</h2>
      <p className="font-sans text-text-dark/70">
        You said you were studying. Your webcam says otherwise.
      </p>
      <Card className="w-full max-w-xl">
        <p className="text-text-dark">
          Lore Drop can detect when you wander off or start scrolling, entirely in your browser.
        </p>
      </Card>
      <p className="font-bold text-text-dark">Nothing leaves your device.</p>
    </div>
  )
}

function QuizTeaserSection() {
  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <h2 className="font-display text-3xl font-semibold text-text-dark">
        Okay, but did you actually learn anything.
      </h2>
      <p className="font-sans text-text-dark/70">Time to put the tea to the test.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
        <Card className="text-left">
          <p className="text-xs font-bold text-accent-coral mb-2">Lightning round</p>
          <p className="text-sm text-text-dark/60 mb-3">Question 3 of 5</p>
          <p className="font-semibold text-text-dark mb-3">
            Which structure is responsible for ATP production.
          </p>
          <div className="flex flex-col gap-2">
            {QUIZ_OPTIONS.map((option) => (
              <div
                key={option}
                className={`rounded-2xl px-4 py-2 text-sm font-sans ${
                  option === 'Mitochondria' ? 'bg-primary-yellow text-text-dark' : 'bg-background-cream text-text-dark/70'
                }`}
              >
                {option}
              </div>
            ))}
          </div>
          <p className="text-sm text-text-dark/50 mt-3">Two correct so far.</p>
        </Card>

        <Card className="text-left">
          <p className="text-xs font-bold text-text-dark/50 mb-3">Your receipts</p>
          <div className="flex flex-col gap-2">
            {RECEIPTS.map((stat) => (
              <p key={stat} className="text-text-dark font-semibold">
                {stat}
              </p>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function ConfessionsSection() {
  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <h2 className="font-display text-3xl font-semibold text-text-dark">Academic confessions.</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {CONFESSIONS.map((confession) => (
          <Card key={confession.quote} className="text-left">
            <p className="text-text-dark italic">{confession.quote}</p>
            <p className="text-sm text-text-dark/50 mt-2">{confession.attribution}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

function FinalCtaSection() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h2 className="font-display text-4xl font-semibold text-text-dark">
        Your lectures are hiding something.
      </h2>
      <p className="font-sans text-text-dark/70">Upload the slides. We'll spill the lore.</p>
      <Button variant="primary" onClick={() => navigate('/upload')}>
        Drop the tea
      </Button>
      <img src="/LoreDrop-hero.png" alt="Lore Drop mascot" className="w-32 h-auto" />
    </div>
  )
}

function Landing() {
  return (
    <PageLayout maxWidth="max-w-4xl">
      <div className="flex flex-col gap-16">
        <Panel>
          <HeroSection />
        </Panel>
        <Panel tinted>
          <BeSoFrSection />
        </Panel>
        <Panel>
          <BeforeAfterSection />
        </Panel>
        <Panel tinted>
          <GenreShowcaseSection />
        </Panel>
        <Panel>
          <HowItWorksSection />
        </Panel>
        <Panel tinted>
          <CaughtLackingSection />
        </Panel>
        <Panel>
          <QuizTeaserSection />
        </Panel>
        <Panel tinted>
          <ConfessionsSection />
        </Panel>
        <Panel>
          <FinalCtaSection />
        </Panel>
      </div>
    </PageLayout>
  )
}

export default Landing
