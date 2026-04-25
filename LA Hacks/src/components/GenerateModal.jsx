import { useState, useMemo } from 'react'
import { useSchedule } from '../context/ScheduleContext'
import { generateStudySchedule } from '../utils/scheduleGenerator'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const p = n => String(n).padStart(2, '0')

function toDateString(date) {
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

function getDateRange(start, end) {
  const dates = []
  const d = new Date(start)
  d.setHours(0, 0, 0, 0)
  const endD = new Date(end)
  endD.setHours(0, 0, 0, 0)
  while (d <= endD) {
    dates.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return dates
}

function makeDefaultDates() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return { start, end }
}

export default function GenerateModal({ onClose }) {
  const { events, addEvents, clearGeneratedEvents } = useSchedule()
  const [subjects, setSubjects] = useState([{ name: '', hours: 2 }])
  const [timeRange, setTimeRange] = useState({ start: '09:00', end: '18:00' })

  const defaults = useMemo(makeDefaultDates, [])
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5])
  const [preview, setPreview] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  const rangeDates = useMemo(() => getDateRange(startDate, endDate), [startDate, endDate])

  const daysInRange = useMemo(() => {
    const daySet = new Set(rangeDates.map(d => d.getDay()))
    return [0, 1, 2, 3, 4, 5, 6].filter(d => daySet.has(d))
  }, [rangeDates])

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

  const handleStartDateChange = (e) => {
    const d = new Date(e.target.value + 'T12:00:00')
    d.setHours(0, 0, 0, 0)
    setStartDate(d)
    if (d > endDate) {
      const newEnd = new Date(d)
      newEnd.setDate(newEnd.getDate() + 6)
      setEndDate(newEnd)
    }
    setPreview(null)
  }

  const handleEndDateChange = (e) => {
    const d = new Date(e.target.value + 'T12:00:00')
    d.setHours(0, 0, 0, 0)
    setEndDate(d)
    setPreview(null)
  }

  const handlePreview = async () => {
    const valid = subjects.filter(s => s.name.trim())
    if (!valid.length || isGenerating) return

    setError('')
    setIsGenerating(true)

    try {
      const rangeDateStrs = new Set(rangeDates.map(toDateString))
      const rangeEvents = events.filter(ev => rangeDateStrs.has(ev.date))
      const activeDays = selectedDays.filter(d => daysInRange.includes(d))

      const result = await generateStudySchedule(rangeEvents, valid, timeRange, activeDays)

      // Expand each generated session to every matching date in the range
      const expanded = []
      for (const ev of result) {
        const matchingDates = rangeDates.filter(d => d.getDay() === ev.day && activeDays.includes(d.getDay()))
        for (const date of matchingDates) {
          expanded.push({ ...ev, date: toDateString(date) })
        }
      }

      setPreview(expanded)
    } catch (err) {
      setPreview(null)
      setError(err?.message || 'Failed to generate a schedule')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleConfirm = () => {
    clearGeneratedEvents()
    addEvents(preview)
    onClose()
  }

  const rangeLabel = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

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
            <h3>Date Range</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={toDateString(startDate)}
                  onChange={handleStartDateChange}
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={toDateString(endDate)}
                  min={toDateString(startDate)}
                  onChange={handleEndDateChange}
                />
              </div>
            </div>
          </section>

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
              {daysInRange.map(dayIdx => (
                <button
                  key={dayIdx}
                  type="button"
                  className={`day-pill ${selectedDays.includes(dayIdx) ? 'active' : ''}`}
                  onClick={() => toggleDay(dayIdx)}
                >
                  {DAYS[dayIdx]}
                </button>
              ))}
            </div>
          </section>

          {error && <p className="form-error">{error}</p>}

          {preview !== null && (
            <section>
              <h3>Preview — {preview.length} session{preview.length !== 1 ? 's' : ''} across {rangeLabel}</h3>
              <div className="preview-list">
                {preview.length === 0 ? (
                  <p className="no-slots">No available slots found. Try widening your time range or adding more days.</p>
                ) : (
                  preview.map((s, i) => {
                    const dateLabel = new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                    })
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
