import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSchedule } from '../context/ScheduleContext'
import EventModal from '../components/EventModal'

const TYPE_COLORS = {
  class:    '#6366f1',
  study:    '#10b981',
  work:     '#f59e0b',
  personal: '#8b5cf6',
}

function formatDateHeader(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
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
    (a.startAt ?? '').localeCompare(b.startAt ?? '')
  )

  // Group by date
  const groups = []
  for (const event of sorted) {
    const last = groups[groups.length - 1]
    if (last && last.date === event.date) {
      last.events.push(event)
    } else {
      groups.push({ date: event.date, events: [event] })
    }
  }

  return (
    <div className="page">
      <header className="app-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/')}>← Back to Calendar</button>
          <h1 className="app-title">Schedule List</h1>
        </div>
        <button className="btn-primary" onClick={() => setEditingEvent({})}>
          + Add Event
        </button>
      </header>

      <main className="schedule-list-container">
        {groups.length === 0 ? (
          <div className="empty-state">
            <div>No events yet. Add your classes, work hours, and other commitments to get started.</div>
            <button className="btn-primary" onClick={() => setEditingEvent({})}>
              Add First Event
            </button>
          </div>
        ) : (
          <div className="event-list">
            {groups.map(group => (
              <div key={group.date} className="event-date-group">
                <h3 className="event-date-header">{formatDateHeader(group.date)}</h3>
                {group.events.map(event => (
                  <div
                    key={event.id}
                    className="event-row"
                    style={{ borderLeftColor: TYPE_COLORS[event.type] ?? '#6366f1' }}
                    onClick={() => setEditingEvent(event)}
                  >
                    <div className="event-row-main">
                      <span className="event-row-title">{event.title}</span>
                      <span className="event-row-type">{event.type}</span>
                      {event.generated && <span className="generated-badge">Generated</span>}
                    </div>
                    <span className="event-row-time">{event.startTime} – {event.endTime}</span>
                  </div>
                ))}
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
