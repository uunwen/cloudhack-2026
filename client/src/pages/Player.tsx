import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout'
import Card from '../components/Card'
import Button from '../components/Button'
import LoadingState from '../components/LoadingState'
import { generateAudio, generateSummary } from '../lib/api'
import { useScript, type AudioScriptLine } from '../lib/ScriptContext'
import { useParsedContent } from '../lib/ParsedContentContext'
import { useAttentionMonitor } from '../lib/useAttentionMonitor'
import { useSessionStats } from '../lib/SessionStatsContext'
import { pickInterventionLine, pickWelcomeBackLine, type InterventionType } from '../lib/interventionAudio'

type Status = 'loading' | 'ready' | 'error'
type SummaryStatus = 'loading' | 'ready' | 'error'
type PanelView = 'transcript' | 'summary'
type MonitorPhase = 'consent' | 'active'
const PLAYBACK_RATES = [1, 1.5, 2] as const

const HOST_AVATAR_BG: Record<'A' | 'B', string> = {
  A: 'bg-accent-coral',
  B: 'bg-text-dark',
}

function HostAvatar({ speaker, active }: { speaker: 'A' | 'B'; active: boolean }) {
  return (
    <div
      className={`flex-shrink-0 h-8 w-8 rounded-full ${HOST_AVATAR_BG[speaker]} text-white flex items-center justify-center font-sans font-bold text-sm ${
        active ? 'animate-glow' : ''
      }`}
    >
      {speaker}
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M3 1.5v13l11-6.5-11-6.5z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="2" y="1" width="4" height="14" rx="1" />
      <rect x="10" y="1" width="4" height="14" rx="1" />
    </svg>
  )
}

function Player() {
  const navigate = useNavigate()
  const { script, preloaded } = useScript()
  const { sections } = useParsedContent()
  const { caughtCount, incrementCaughtCount, addFocusSeconds } = useSessionStats()
  const attention = useAttentionMonitor()

  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [audioScript, setAudioScript] = useState<AudioScriptLine[] | null>(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [finished, setFinished] = useState(false)
  const [playbackRate, setPlaybackRate] = useState<(typeof PLAYBACK_RATES)[number]>(1)

  const [panelView, setPanelView] = useState<PanelView>('transcript')
  const [summaryStatus, setSummaryStatus] = useState<SummaryStatus>('loading')
  const [summary, setSummary] = useState<string | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const [monitorPhase, setMonitorPhase] = useState<MonitorPhase>('consent')
  const [showIntervention, setShowIntervention] = useState(false)
  const [interventionType, setInterventionType] = useState<InterventionType | null>(null)

  const audioRef = useRef<HTMLAudioElement>(null)
  const interventionAudioRef = useRef<HTMLAudioElement>(null)
  const lineRefs = useRef<Array<HTMLDivElement | null>>([])
  const hasFetchedRef = useRef(false)
  const hasFetchedSummaryRef = useRef(false)

  function fetchAudio(lines: NonNullable<typeof script>) {
    setStatus('loading')
    setError(null)
    generateAudio(lines)
      .then((result) => {
        setAudioScript(result)
        setStatus('ready')
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Something went wrong while generating audio.')
        setStatus('error')
      })
  }

  useEffect(() => {
    if (!script || script.length === 0) return
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    // A pre-generated backup episode already has audio -- skip the API call entirely.
    if (preloaded) {
      setAudioScript(preloaded.audioScript)
      setStatus('ready')
      return
    }
    fetchAudio(script)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script])

  function fetchSummary(secs: NonNullable<typeof sections>) {
    setSummaryStatus('loading')
    setSummaryError(null)
    generateSummary(secs)
      .then((result) => {
        setSummary(result)
        setSummaryStatus('ready')
      })
      .catch((err) => {
        setSummaryError(err instanceof Error ? err.message : 'Something went wrong while generating the summary.')
        setSummaryStatus('error')
      })
  }

  // Fires independently of (and at the same time as) the audio fetch above -- neither blocks
  // the other.
  useEffect(() => {
    if (!sections || sections.length === 0) return
    if (hasFetchedSummaryRef.current) return
    hasFetchedSummaryRef.current = true
    if (preloaded) {
      setSummary(preloaded.summary)
      setSummaryStatus('ready')
      return
    }
    fetchSummary(sections)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections])

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.playbackRate = playbackRate
    if (isPlaying) {
      audioRef.current.play().catch(() => {})
    } else {
      audioRef.current.pause()
    }
  }, [isPlaying, currentIndex, playbackRate])

  useEffect(() => {
    const el = lineRefs.current[currentIndex]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentIndex])

  // "Focus time" for the session recap -- wall-clock seconds actually spent playing
  // (naturally excludes manual pauses, interventions, and time after the episode finishes).
  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => addFocusSeconds(1), 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying])

  // Fires whenever the attention monitor detects sustained ghosting/doom-scrolling --
  // pauses the episode (via the existing play/pause effect, which preserves currentTime)
  // and plays a pre-generated roast line matching whoever was speaking.
  useEffect(() => {
    if (!attention.triggeredEvent || !audioScript) return
    setIsPlaying(false)
    incrementCaughtCount()
    setInterventionType(attention.triggeredEvent.type)
    setShowIntervention(true)
    const speaker = audioScript[currentIndex].speaker
    if (interventionAudioRef.current) {
      interventionAudioRef.current.onended = null
      interventionAudioRef.current.src = pickInterventionLine(attention.triggeredEvent.type, speaker)
      interventionAudioRef.current.play().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attention.triggeredEvent])

  // Auto-dismiss as soon as the camera confirms the user is back, in addition to the
  // explicit "Okay I'm back" button.
  useEffect(() => {
    if (showIntervention && attention.isCurrentlyAttentive) {
      handleReengaged()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attention.isCurrentlyAttentive, showIntervention])

  // Nothing left to watch attention for once the episode is done.
  useEffect(() => {
    if (finished) {
      attention.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  function handleReengaged() {
    attention.clearTriggeredEvent()
    setShowIntervention(false)
    setInterventionType(null)
    const speaker = audioScript ? audioScript[currentIndex].speaker : 'A'
    if (interventionAudioRef.current) {
      interventionAudioRef.current.onended = () => setIsPlaying(true)
      interventionAudioRef.current.src = pickWelcomeBackLine(speaker)
      interventionAudioRef.current.play().catch(() => setIsPlaying(true))
    } else {
      setIsPlaying(true)
    }
  }

  async function handleAllowAndStart() {
    const granted = await attention.requestAccess()
    if (granted) {
      setMonitorPhase('active')
      setIsPlaying(true)
    }
  }

  function handleSkipCamera() {
    setMonitorPhase('active')
    setIsPlaying(true)
  }

  function handleEnded() {
    if (!audioScript) return
    if (currentIndex + 1 < audioScript.length) {
      setCurrentIndex((i) => i + 1)
    } else {
      setIsPlaying(false)
      setFinished(true)
    }
  }

  function handleRetry() {
    if (!script) return
    fetchAudio(script)
  }

  function handleRetrySummary() {
    if (!sections) return
    fetchSummary(sections)
  }

  function handleSpeedChange(rate: (typeof PLAYBACK_RATES)[number]) {
    setPlaybackRate(rate)
    if (audioRef.current) {
      audioRef.current.playbackRate = rate
    }
  }

  if (!script || script.length === 0) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center gap-8 text-center">
          <h1 className="font-sans text-3xl font-bold text-text-dark">Player</h1>
          <Card className="w-full">
            <p className="text-text-dark/70">
              No script yet — head back and generate an episode first.
            </p>
          </Card>
          <Button variant="primary" onClick={() => navigate('/genre-select')}>
            Back to Genres
          </Button>
        </div>
      </PageLayout>
    )
  }

  if (status === 'loading') {
    return (
      <PageLayout>
        <LoadingState message="Bringing in the hosts..." />
      </PageLayout>
    )
  }

  if (status === 'error') {
    return (
      <PageLayout>
        <div className="flex flex-col items-center gap-8 text-center">
          <h1 className="font-sans text-3xl font-bold text-text-dark">Player</h1>
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

  if (!audioScript) return null

  const currentLine = audioScript[currentIndex]
  const progressPct = ((currentIndex + (finished ? 1 : 0)) / audioScript.length) * 100

  // Rendered exactly once, at a stable position in the tree, for the whole lifetime of this
  // component -- critical so the webcam stream (attached via this ref in requestAccess())
  // never gets orphaned by React swapping in a different <video> DOM node when monitorPhase
  // changes between the branches below.
  const hiddenVideo = (
    <video
      key="attention-video"
      ref={attention.videoRef}
      className="absolute w-px h-px opacity-0 pointer-events-none"
      muted
      playsInline
    />
  )

  if (monitorPhase === 'consent') {
    if (attention.consentStatus === 'requesting') {
      return (
        <PageLayout>
          {hiddenVideo}
          <LoadingState message="Getting the camera ready..." />
        </PageLayout>
      )
    }
    return (
      <PageLayout>
        {hiddenVideo}
        <div className="flex flex-col items-center gap-8 text-center">
          <h1 className="font-sans text-3xl font-bold text-text-dark">Player</h1>
          <Card className="w-full">
            <p className="text-text-dark">
              This app watches your webcam locally to keep you honest — nothing is recorded or
              sent anywhere.
            </p>
            {attention.consentStatus === 'denied' && (
              <p className="text-accent-coral text-sm mt-3">
                Camera access was blocked or unavailable.
              </p>
            )}
          </Card>
          <Button variant="primary" onClick={handleAllowAndStart}>
            Allow & Start
          </Button>
          {attention.consentStatus === 'denied' && (
            <Button variant="secondary" onClick={handleSkipCamera}>
              Continue without camera check
            </Button>
          )}
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      {showIntervention && (
        <div className="fixed inset-0 z-50 bg-accent-coral flex flex-col items-center justify-center gap-6 text-center p-8">
          <h2 className="font-sans text-4xl font-bold text-white">THE HOSTS HAVE NOTICED 👀</h2>
          <p className="text-white/90 text-lg">
            {interventionType === 'ghosting' ? "You wandered off, didn't you?" : 'Caught looking down. We see you.'}
          </p>
          <p className="text-white/80">
            Caught {caughtCount} time{caughtCount === 1 ? '' : 's'} this session.
          </p>
          <Button variant="secondary" onClick={handleReengaged}>
            Okay I'm back
          </Button>
        </div>
      )}

      {hiddenVideo}
      <audio ref={interventionAudioRef} className="hidden" />

      <div className="flex flex-col items-center gap-8">
        <h1 className="font-sans text-3xl font-bold text-text-dark text-center">Player</h1>

        <audio ref={audioRef} src={currentLine?.audioUrl} onEnded={handleEnded} className="hidden" />

        <div className="w-full flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="flex-shrink-0 h-12 w-12 rounded-full bg-accent-coral text-white flex items-center justify-center transition-transform active:scale-95"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <div className="flex-shrink-0 flex gap-1">
            {PLAYBACK_RATES.map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => handleSpeedChange(rate)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold font-sans transition-colors ${
                  playbackRate === rate ? 'bg-accent-coral text-white' : 'bg-white text-text-dark/70'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
          <div className="flex-1">
            <div className="h-2 rounded-full bg-primary-yellow/50 overflow-hidden">
              <div
                className="h-full bg-accent-coral transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-text-dark/60 mt-1">
              Line {Math.min(currentIndex + 1, audioScript.length)} of {audioScript.length}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPanelView((v) => (v === 'transcript' ? 'summary' : 'transcript'))}
          className="self-end text-sm font-semibold text-accent-coral hover:opacity-80 font-sans"
        >
          {panelView === 'transcript' ? 'Show Summary' : 'Show Transcript'}
        </button>

        {panelView === 'transcript' && (
          <Card className="w-full text-left max-h-[420px] overflow-y-auto flex flex-col gap-3">
            {audioScript.map((line, i) => {
              const isCurrent = i === currentIndex
              const isPast = i < currentIndex
              return (
                <div
                  key={i}
                  ref={(el) => {
                    lineRefs.current[i] = el
                  }}
                  className={`flex items-start gap-3 rounded-2xl p-3 transition-all duration-300 ${
                    isCurrent ? 'bg-primary-yellow scale-105' : ''
                  } ${isPast ? 'opacity-40' : ''}`}
                >
                  <HostAvatar speaker={line.speaker} active={isCurrent} />
                  <p className="text-text-dark pt-1">{line.text}</p>
                </div>
              )
            })}
          </Card>
        )}

        {panelView === 'summary' && (
          <Card className="w-full text-left max-h-[420px] overflow-y-auto">
            {summaryStatus === 'loading' && <LoadingState message="Jotting down the highlights..." />}
            {summaryStatus === 'error' && (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <p className="text-accent-coral">{summaryError}</p>
                <Button variant="secondary" onClick={handleRetrySummary}>
                  Try Again
                </Button>
              </div>
            )}
            {summaryStatus === 'ready' && summary && (
              <ul className="list-disc list-inside text-text-dark space-y-2">
                {summary
                  .split('\n')
                  .map((line) => line.replace(/^[-*•]\s*/, '').trim())
                  .filter(Boolean)
                  .map((bullet, i) => (
                    <li key={i}>{bullet}</li>
                  ))}
              </ul>
            )}
          </Card>
        )}

        {finished && (
          <Button variant="primary" onClick={() => navigate('/quiz')}>
            Continue to Quiz
          </Button>
        )}
      </div>
    </PageLayout>
  )
}

export default Player
