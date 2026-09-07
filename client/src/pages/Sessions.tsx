import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout'
import Card from '../components/Card'
import Button from '../components/Button'

const STATS = [
  { value: '12', label: 'episodes generated' },
  { value: '4.2', label: 'average quiz score' },
  { value: '68', label: 'percent average focus time' },
  { value: '23', label: 'times caught slipping' },
]

const PAST_SESSIONS = [
  { genre: 'Gossip podcast', topic: 'Cellular respiration', score: '4 out of 5', focusTime: '14 minutes', date: '2 days ago' },
  { genre: 'True crime', topic: 'The French Revolution', score: '5 out of 5', focusTime: '21 minutes', date: '5 days ago' },
  { genre: 'Gen Z explainer', topic: 'Supervised learning basics', score: '3 out of 5', focusTime: '9 minutes', date: '1 week ago' },
  { genre: 'Sports commentary', topic: 'Black holes', score: '4 out of 5', focusTime: '17 minutes', date: '1 week ago' },
  { genre: 'Reality TV drama', topic: 'The water cycle', score: '5 out of 5', focusTime: '11 minutes', date: '2 weeks ago' },
]

function Sessions() {
  const navigate = useNavigate()

  return (
    <PageLayout>
      <div className="flex flex-col items-center gap-8 text-center">
        <div>
          <h1 className="font-display text-3xl font-semibold text-text-dark">My sessions</h1>
          <p className="text-text-dark/60 mt-2">Your lecture to lore history. Demo data for now.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
          {STATS.map((stat) => (
            <Card key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-text-dark">{stat.value}</p>
              <p className="text-xs text-text-dark/60 mt-1">{stat.label}</p>
            </Card>
          ))}
        </div>

        <div className="w-full flex flex-col gap-3">
          {PAST_SESSIONS.map((session, i) => (
            <Card
              key={i}
              className="text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              <div>
                <p className="text-xs font-bold text-accent-coral">{session.genre}</p>
                <p className="font-semibold text-text-dark">{session.topic}</p>
              </div>
              <div className="flex gap-4 text-sm text-text-dark/70 whitespace-nowrap">
                <span>{session.score}</span>
                <span>{session.focusTime}</span>
                <span className="text-text-dark/50">{session.date}</span>
              </div>
            </Card>
          ))}
        </div>

        <p className="text-xs text-text-dark/50 max-w-md">
          Session history is illustrative for this demo. Lore Drop does not yet save real session
          data.
        </p>

        <Button variant="primary" onClick={() => navigate('/upload')}>
          Start a new session
        </Button>
      </div>
    </PageLayout>
  )
}

export default Sessions
