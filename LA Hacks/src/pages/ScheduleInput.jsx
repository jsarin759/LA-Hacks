import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSchedule } from '../context/ScheduleContext'
import EventModal from '../components/EventModal'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TYPE_COLORS = {
  class:    '#6366f1',
  study:    '#10b981',
  work:     '#f59e0b',
  personal: '#8b5cf6',
}

export default function ScheduleInput() {
  const navigate = useNavigate()
  const { events, addEvent, updateEvent, removeEvent } = useSchedule()
  const [editingEvent, setEditingEvent] = useState(null)

  const handleSave = (formData) => {
    if (editingEvent?.id) {
      updateEvent(editingEvent.id, formData)
    } else {
      addEvent(formData)
    }
    setEditingEvent(null)
  }

  const handleDelete = (id) => {
    removeEvent(id)
    setEditingEvent(null)
  }

  const sorted = [...events].sort((a, b) =>
    a.day !== b.day ? a.day - b.day : a.startTime.localeCompare(b.startTime)
  )

  return (
    <div className="page">
      <header className="app-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/')}>← Back to Calendar</button>
          <h1 className="app-title">Manage Schedule</h1>
        </div>
        <button className="btn-primary" onClick={() => setEditingEvent({})}>
          + Add Event
        </button>
      </header>

      <main className="schedule-list-container">
        {sorted.length === 0 ? (
          <div className="empty-state">
            <div>No events yet. Add your classes, work hours, and other commitments to get started.</div>
            <button className="btn-primary" onClick={() => setEditingEvent({})}>
              Add First Event
            </button>
          </div>
        ) : (
          <div className="event-list">
            {sorted.map(event => (
              <div key={event.id} className="event-list-item" onClick={() => setEditingEvent(event)}>
                <div
                  className="event-type-badge"
                  style={{ backgroundColor: TYPE_COLORS[event.type] ?? '#6366f1' }}
                >
                  {event.type}
                </div>
                <div className="event-info">
                  <span className="event-name">{event.title}</span>
                  <span className="event-details">
                    {DAYS[event.day]} · {event.startTime} – {event.endTime}
                  </span>
                </div>
                {event.generated && <span className="generated-badge">Generated</span>}
              </div>
            ))}
          </div>
        )}
      </main>

      {editingEvent !== null && (
        <EventModal
          event={editingEvent}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </div>
  )
}
