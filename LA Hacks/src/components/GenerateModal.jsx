import { useState } from 'react'
import { useSchedule } from '../context/ScheduleContext'
import { generateStudySchedule } from '../utils/scheduleGenerator'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const p = n => String(n).padStart(2, '0')

function getWeekSunday(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function toDateString(date) {
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

export default function GenerateModal({ onClose }) {
  const { events, addEvents, clearGeneratedEvents } = useSchedule()
  const [subjects, setSubjects] = useState([{ name: '', hours: 2 }])
  const [timeRange, setTimeRange] = useState({ start: '09:00', end: '18:00' })
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5])
  const [weekStart, setWeekStart] = useState(() => getWeekSunday(new Date()))
  const [preview, setPreview] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  const addSubject = () => setSubjects(s => [...s, { name: '', hours: 2 }])
  const removeSubject = (i) => setSubjects(s => s.filter((_, idx) => idx !== i))
  const updateSubject = (i, field, value) =>
    setSubjects(s => s.map((sub, idx) => (idx === i ? { ...sub, [field]: value } : sub)))

  const toggleDay = (d) => {
    setSelectedDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b)
    )
    setPreview(null)
  }

  const handleWeekChange = (e) => {
    const picked = new Date(e.target.value + 'T12:00:00')
    setWeekStart(getWeekSunday(picked))
    setPreview(null)
  }

  const handlePreview = async () => {
    const valid = subjects.filter(s => s.name.trim())
    if (!valid.length || isGenerating) return

    setError('')
    setIsGenerating(true)

    try {
      // Only pass events from the target week as conflicts
      const weekDateStrs = new Set(weekDates.map(toDateString))
      const weekEvents = events.filter(ev => weekDateStrs.has(ev.date))

      const result = await generateStudySchedule(weekEvents, valid, timeRange, selectedDays)
      setPreview(result)
    } catch (err) {
      setPreview(null)
      setError(err?.message || 'Failed to generate a schedule')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleConfirm = () => {
    const withDates = preview.map(ev => {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + ev.day)
      return { ...ev, date: toDateString(d) }
    })
    clearGeneratedEvents()
    addEvents(withDates)
    onClose()
  }

  const weekLabel = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Generate Study Schedule</h2>
          <button className="close-btn" type="button" onClick={onClose}>✕</button>
        </div>

        <div className="generate-body">
          <section>
            <h3>Subjects to Study</h3>
            {subjects.map((sub, i) => (
              <div key={i} className="subject-row">
                <input
                  type="text"
                  placeholder="Subject name (e.g. Math, History)"
                  value={sub.name}
                  onChange={e => updateSubject(i, 'name', e.target.value)}
                />
                <div className="hours-input">
                  <input
                    type="number"
                    min="0.5"
                    max="40"
                    step="0.5"
                    value={sub.hours}
                    onChange={e => updateSubject(i, 'hours', Number(e.target.value))}
                  />
                  <span>hrs/wk</span>
                </div>
                {subjects.length > 1 && (
                  <button className="icon-btn" type="button" onClick={() => removeSubject(i)}>✕</button>
                )}
              </div>
            ))}
            <button className="btn-ghost" type="button" onClick={addSubject}>+ Add Subject</button>
          </section>

          <section>
            <h3>Schedule For</h3>
            <div className="form-row" style={{ alignItems: 'center' }}>
              <div className="form-group">
                <label>Pick any date in the week</label>
                <input
                  type="date"
                  value={toDateString(weekStart)}
                  onChange={handleWeekChange}
                />
              </div>
              <span className="week-range-label">{weekLabel}</span>
            </div>
          </section>

          {error && <p className="form-error">{error}</p>}

          <section>
            <h3>Preferred Study Hours</h3>
            <div className="form-row">
              <div className="form-group">
                <label>From</label>
                <input
                  type="time"
                  value={timeRange.start}
                  onChange={e => setTimeRange(r => ({ ...r, start: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>To</label>
                <input
                  type="time"
                  value={timeRange.end}
                  onChange={e => setTimeRange(r => ({ ...r, end: e.target.value }))}
                />
              </div>
            </div>
          </section>

          <section>
            <h3>Study Days</h3>
            <div className="day-selector">
              {weekDates.map((date, i) => (
                <button
                  key={i}
                  type="button"
                  className={`day-pill ${selectedDays.includes(i) ? 'active' : ''}`}
                  onClick={() => toggleDay(i)}
                >
                  <span>{DAYS[i]}</span>
                  <span className="day-pill-date">{date.getMonth() + 1}/{date.getDate()}</span>
                </button>
              ))}
            </div>
          </section>

          {preview !== null && (
            <section>
              <h3>Preview — {preview.length} session{preview.length !== 1 ? 's' : ''} generated</h3>
              <div className="preview-list">
                {preview.length === 0 ? (
                  <p className="no-slots">No available slots found. Try widening your time range or adding more days.</p>
                ) : (
                  preview.map((s, i) => {
                    const d = new Date(weekStart)
                    d.setDate(weekStart.getDate() + s.day)
                    const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                    return (
                      <div key={i} className="preview-item">
                        <span className="preview-title">{s.title}</span>
                        <span className="preview-time">{dateLabel} · {s.startTime}–{s.endTime}</span>
                      </div>
                    )
                  })
                )}
              </div>
            </section>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
          <div className="modal-actions-right">
            <button className="btn-secondary" type="button" onClick={handlePreview} disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Preview'}
            </button>
            {preview !== null && preview.length > 0 && (
              <button className="btn-primary" type="button" onClick={handleConfirm}>
                Add to Calendar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
