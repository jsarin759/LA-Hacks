import { useState } from 'react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const EVENT_TYPES = ['class', 'study', 'work', 'personal']

const today = new Date().toISOString().split('T')[0]

export default function EventModal({ event, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    title: event?.title ?? '',
    type: event?.type ?? 'class',
    date: event?.date ?? today,
    day: event?.day ?? new Date().getDay(),
    startTime: event?.startTime ?? '09:00',
    endTime: event?.endTime ?? '10:00',
  })

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const setDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    setForm(f => ({ ...f, date: dateStr, day: d.getDay() }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    onSave(form)
  }

  const isEditing = Boolean(event?.id)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Event' : 'Add Event'}</h2>
          <button className="close-btn" onClick={onClose} type="button">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. CS 101 Lecture"
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}>
                {EVENT_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={e => set('startTime', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>End Time</label>
              <input
                type="time"
                value={form.endTime}
                onChange={e => set('endTime', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="modal-actions">
            <div>
              {isEditing && (
                <button type="button" className="btn-danger" onClick={() => onDelete(event.id)}>
                  Delete
                </button>
              )}
            </div>
            <div className="modal-actions-right">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary">
                {isEditing ? 'Save Changes' : 'Add Event'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
