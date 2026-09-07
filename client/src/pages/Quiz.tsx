import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout'
import Card from '../components/Card'
import Button from '../components/Button'
import LoadingState from '../components/LoadingState'
import { generateQuiz, type QuizQuestion } from '../lib/api'
import { useParsedContent } from '../lib/ParsedContentContext'
import { useScript } from '../lib/ScriptContext'
import { useSessionStats } from '../lib/SessionStatsContext'
import { pickRoastLine } from '../lib/quizRoasts'

type Status = 'loading' | 'ready' | 'error'
type QuizPhase = 'playing' | 'results'

const QUESTION_SECONDS = 10

function verdict(score: number, total: number): string {
  const ratio = score / total
  if (ratio >= 0.8) return "You basically co-hosted this episode. Iconic. 🏆"
  if (ratio >= 0.4) return "Respectable. The hosts are cautiously impressed."
  return "Bestie... did you fall asleep? It's giving 'ghosted the hosts'. 💀"
}

function Quiz() {
  const navigate = useNavigate()
  const { sections, setSections } = useParsedContent()
  const { setScript, preloaded, setPreloaded } = useScript()
  const { caughtCount, focusSeconds, resetSessionStats } = useSessionStats()

  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null)

  const [phase, setPhase] = useState<QuizPhase>('playing')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS)
  const [answered, setAnswered] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [roastLine, setRoastLine] = useState<string | null>(null)

  const hasFetchedRef = useRef(false)

  function fetchQuiz(secs: NonNullable<typeof sections>) {
    setStatus('loading')
    setError(null)
    generateQuiz(secs)
      .then((result) => {
        setQuestions(result)
        setStatus('ready')
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Something went wrong while generating the quiz.')
        setStatus('error')
      })
  }

  useEffect(() => {
    if (!sections || sections.length === 0) return
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    if (preloaded) {
      setQuestions(preloaded.quiz)
      setStatus('ready')
      return
    }
    fetchQuiz(sections)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections])

  function resolveAnswer(index: number | null) {
    if (answered || !questions) return
    setAnswered(true)
    setSelectedIndex(index)

    const question = questions[currentQuestionIndex]
    const isCorrect = index !== null && index === question.correctIndex

    if (isCorrect) {
      setScore((s) => s + 1)
      setStreak((s) => {
        const next = s + 1
        setBestStreak((best) => Math.max(best, next))
        return next
      })
    } else {
      setStreak(0)
      setRoastLine(pickRoastLine())
    }

    setTimeout(() => {
      setAnswered(false)
      setSelectedIndex(null)
      setRoastLine(null)
      if (currentQuestionIndex + 1 < questions.length) {
        setCurrentQuestionIndex((i) => i + 1)
        setTimeLeft(QUESTION_SECONDS)
      } else {
        setPhase('results')
      }
    }, 1500)
  }

  useEffect(() => {
    if (status !== 'ready' || phase !== 'playing' || answered) return
    if (timeLeft <= 0) {
      resolveAnswer(null)
      return
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, phase, answered, timeLeft])

  function handleRetry() {
    if (!sections) return
    fetchQuiz(sections)
  }

  function handleTryAnotherEpisode() {
    setSections(null)
    setScript(null)
    setPreloaded(null)
    resetSessionStats()
    navigate('/upload')
  }

  if (!sections || sections.length === 0) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center gap-8 text-center">
          <h1 className="font-sans text-3xl font-bold text-text-dark">Quiz</h1>
          <Card className="w-full">
            <p className="text-text-dark/70">
              We don't have anything to quiz you on yet — head back and upload something first.
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
        <LoadingState message="Writing your quiz..." />
      </PageLayout>
    )
  }

  if (status === 'error') {
    return (
      <PageLayout>
        <div className="flex flex-col items-center gap-8 text-center">
          <h1 className="font-sans text-3xl font-bold text-text-dark">Quiz</h1>
          <Card className="w-full">
            <p className="text-accent-coral">{error}</p>
          </Card>
          <Button variant="primary" onClick={handleRetry}>
            Try Again
          </Button>
        </div>
      </PageLayout>
    )
  }

  if (!questions) return null

  if (phase === 'results') {
    const focusMinutes = Math.round(focusSeconds / 60)
    return (
      <PageLayout>
        <div className="flex flex-col items-center gap-8 text-center">
          <h1 className="font-sans text-3xl font-bold text-text-dark">Results</h1>
          <Card className="w-full">
            <p className="text-2xl font-bold text-text-dark">
              {score}/{questions.length}
            </p>
            <p className="text-text-dark/70 mt-1">Best streak: {bestStreak} 🔥</p>
            <p className="text-text-dark mt-4">{verdict(score, questions.length)}</p>
          </Card>

          <Card className="w-full bg-primary-yellow">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src="/LoreDrop.png" alt="Lore Drop mascot" className="h-10 w-auto" />
              <p className="font-sans font-bold text-lg text-text-dark">Lore Drop Recap</p>
            </div>
            <p className="text-text-dark">
              Focus time: <span className="font-bold">{focusMinutes} minute{focusMinutes === 1 ? '' : 's'}</span>.
              <br />
              Times caught slipping: <span className="font-bold">{caughtCount}</span>.
            </p>
          </Card>

          <Button variant="primary" onClick={handleTryAnotherEpisode}>
            Try Another Episode
          </Button>
        </div>
      </PageLayout>
    )
  }

  const question = questions[currentQuestionIndex]

  return (
    <PageLayout>
      <div className="flex flex-col items-center gap-8">
        <h1 className="font-sans text-3xl font-bold text-text-dark text-center">Quiz</h1>

        <div className="w-full flex items-center justify-between text-sm font-sans text-text-dark/70">
          <span>
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span>Score: {score}</span>
          <span>Streak: {streak} 🔥</span>
          <span className={timeLeft <= 3 ? 'text-accent-coral font-bold' : ''}>⏱ {timeLeft}s</span>
        </div>

        <Card className="w-full text-left flex flex-col gap-4">
          <p className="text-lg font-semibold text-text-dark">{question.question}</p>

          <div className="flex flex-col gap-2">
            {question.options.map((option, i) => {
              const isSelected = selectedIndex === i
              const isCorrectOption = i === question.correctIndex
              let stateClasses = 'bg-background-cream text-text-dark'
              if (answered) {
                if (isCorrectOption) {
                  stateClasses = 'bg-primary-yellow text-text-dark scale-105'
                } else if (isSelected) {
                  stateClasses = 'bg-accent-coral text-white'
                } else {
                  stateClasses = 'bg-background-cream text-text-dark/50'
                }
              }
              return (
                <button
                  key={i}
                  type="button"
                  disabled={answered}
                  onClick={() => resolveAnswer(i)}
                  className={`text-left rounded-2xl px-4 py-3 font-sans transition-all duration-300 ${stateClasses}`}
                >
                  {option}
                </button>
              )
            })}
          </div>

          {roastLine && <p className="text-accent-coral font-sans">{roastLine}</p>}
          {answered && !roastLine && <p className="text-text-dark font-sans">Nice! 🎉</p>}
        </Card>
      </div>
    </PageLayout>
  )
}

export default Quiz
