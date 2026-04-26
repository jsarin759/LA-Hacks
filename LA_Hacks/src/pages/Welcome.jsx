import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect } from 'react'

const features = [
  {
    icon: '✦',
    title: 'AI Study Plan Generation',
    description: 'Describe your subjects and available hours. Gemini builds a Pomodoro-style schedule that fits around your existing commitments.',
  },
  {
    icon: '📅',
    title: 'Google Calendar Sync',
    description: 'Import your classes and events from Google Calendar, then export your full study schedule back — duplicates are detected automatically.',
  },
  {
    icon: '⏱',
    title: 'Smart Pomodoro Rhythm',
    description: 'Every generated session is 25–45 minutes with built-in break gaps. No back-to-back marathons — just focused, sustainable work.',
  },
  {
    icon: '🗓',
    title: 'Drag-and-Drop Calendar',
    description: 'See your entire week at a glance. Click any empty slot to add an event, drag existing ones to reschedule on the fly.',
  },
]

export default function Welcome() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true })
  }, [user, loading, navigate])

  if (loading) return <div className="auth-loading">Loading…</div>

  return (
    <div className="welcome-page">
      <header className="welcome-nav">
        <span className="welcome-logo">StudySync</span>
        <div className="welcome-nav-actions">
          <button className="btn-secondary" onClick={() => navigate('/login')}>Sign In</button>
          <button className="btn-primary" onClick={() => navigate('/signup')}>Get Started</button>
        </div>
      </header>

      <main className="welcome-main">
        <section className="welcome-hero">
          <div className="welcome-badge">Powered by Gemini AI</div>
          <h1 className="welcome-headline">
            Study smarter,<br />not harder.
          </h1>
          <p className="welcome-subheadline">
            StudySync builds a personalized weekly study plan around your classes,
            work, and life — then keeps it in sync with Google Calendar.
          </p>
          <div className="welcome-cta-group">
            <button className="btn-primary welcome-cta-primary" onClick={() => navigate('/signup')}>
              Create free account
            </button>
            <button className="btn-secondary welcome-cta-secondary" onClick={() => navigate('/login')}>
              Sign in
            </button>
          </div>
        </section>

        <section className="welcome-features">
          {features.map(f => (
            <div key={f.title} className="welcome-feature-card">
              <span className="welcome-feature-icon">{f.icon}</span>
              <h3 className="welcome-feature-title">{f.title}</h3>
              <p className="welcome-feature-desc">{f.description}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
