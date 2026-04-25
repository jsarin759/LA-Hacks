import { useState } from 'react'
import { useSchedule } from '../context/ScheduleContext'
import { generateStudySchedule } from '../utils/scheduleGenerator'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function GenerateModal({ onClose }) {
  const { events, addEvents, clearGeneratedEvents } = useSchedule()
  const [subjects, setSubjects] = useState([{ name: '', hours: 2 }])
  const [timeRange, setTimeRange] = useState({ start: '09:00', end: '18:00' })
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5])
  const [preview, setPreview] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  const addSubject = () => setSubjects(s => [...s, { name: '', hours: 2 }])
  const removeSubject = (i) => setSubjects(s => s.filter((_, idx) => idx !== i))
  const updateSubject = (i, field, value) =>
    setSubjects(s => s.map((sub, idx) => (idx === i ? { ...sub, [field]: value } : sub)))

  const toggleDay = (d) =>
    setSelectedDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b)
    )

  const handlePreview = async () => {
    const valid = subjects.filter(s => s.name.trim())
    if (!valid.length || isGenerating) return

    setError('')
    setIsGenerating(true)

    try {
      const result = await generateStudySchedule(events, valid, timeRange, selectedDays)
      setPreview(result)
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
              {DAYS.map((day, i) => (
                <button
                  key={day}
                  type="button"
                  className={`day-pill ${selectedDays.includes(i) ? 'active' : ''}`}
                  onClick={() => toggleDay(i)}
                >
                  {day}
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
                  preview.map((s, i) => (
                    <div key={i} className="preview-item">
                      <span className="preview-title">{s.title}</span>
                      <span className="preview-time">{DAYS[s.day]} · {s.startTime}–{s.endTime}</span>
                    </div>
                  ))
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
