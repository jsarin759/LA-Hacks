import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import WeekCalendar from '../components/WeekCalendar'
import EventModal from '../components/EventModal'
import GenerateModal from '../components/GenerateModal'
import { useSchedule } from '../context/ScheduleContext'
import { useAuth } from '../context/AuthContext'

const pad = n => String(n).padStart(2, '0')

function toTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function mapGoogleEventToLocal(event) {
  const startDateTime = event?.start?.dateTime
  const endDateTime = event?.end?.dateTime
  if (!startDateTime || !endDateTime) return null
  const start = new Date(startDateTime)
  const end = new Date(endDateTime)
  const date = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
  const type = event.extendedProperties?.private?.studysync_type ?? 'class'
  return {
    title: event.summary || 'Google Event',
    type,
    date,
    day: start.getDay(),
    startTime: toTime(start),
    endTime: toTime(end),
    googleEventId: event.id,
  }
}

export default function Home() {
  const navigate = useNavigate()
  const { events, addEvent, addEvents, updateEvent, removeEvent } = useSchedule()
  const {
    user,
    signOut,
    googleCalendarConnected,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    fetchGoogleEvents,
    createGoogleEvent,
    updateGoogleEvent,
  } = useAuth()
  const [editingEvent, setEditingEvent] = useState(null)
  const [showGenerate, setShowGenerate] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleMessage, setGoogleMessage] = useState('')
  const [googleMenuOpen, setGoogleMenuOpen] = useState(false)
  const googleMenuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (googleMenuRef.current && !googleMenuRef.current.contains(e.target)) {
        setGoogleMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const handleGoogleConnectToggle = async () => {
    setGoogleMessage('')
    setGoogleLoading(true)
    try {
      if (googleCalendarConnected) {
        await disconnectGoogleCalendar()
        setGoogleMessage('Disconnected Google Calendar.')
      } else {
        await connectGoogleCalendar()
      }
    } catch (error) {
      setGoogleMessage(error.message || 'Could not update Google connection')
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleImportGoogle = async () => {
    setGoogleMessage('')
    setGoogleLoading(true)
    try {
      const now = new Date()
      const weekEnd = new Date(now)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const googleEvents = await fetchGoogleEvents(now.toISOString(), weekEnd.toISOString())
      const mapped = googleEvents.map(mapGoogleEventToLocal).filter(Boolean)

      const existingGoogleIds = new Set(events.map(e => e.googleEventId).filter(Boolean))
      const newEvents = mapped.filter(e => !existingGoogleIds.has(e.googleEventId))

      if (newEvents.length === 0) {
        setGoogleMessage('All Google events are already on your calendar.')
      } else {
        await addEvents(newEvents)
        setGoogleMessage(`Added ${newEvents.length} new event${newEvents.length !== 1 ? 's' : ''} from Google Calendar.`)
      }
    } catch (error) {
      setGoogleMessage(error.message || 'Import from Google failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleExportGoogle = async () => {
    setGoogleMessage('')
    setGoogleLoading(true)
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const newEvents = events.filter(e => !e.googleEventId)
      const rescheduledEvents = events.filter(e => e.googleEventId)
      let exported = 0
      let updated = 0

      for (const event of newEvents) {
        const created = await createGoogleEvent({
          summary: event.title,
          description: 'Exported from StudySync',
          start: { dateTime: `${event.date}T${event.startTime}:00`, timeZone },
          end: { dateTime: `${event.date}T${event.endTime}:00`, timeZone },
          extendedProperties: { private: { studysync_type: event.type } },
        })
        await updateEvent(event.id, { googleEventId: created.id })
        exported += 1
      }

      for (const event of rescheduledEvents) {
        await updateGoogleEvent(event.googleEventId, {
          summary: event.title,
          start: { dateTime: `${event.date}T${event.startTime}:00`, timeZone },
          end: { dateTime: `${event.date}T${event.endTime}:00`, timeZone },
          extendedProperties: { private: { studysync_type: event.type } },
        })
        updated += 1
      }

      if (exported === 0 && updated === 0) {
        setGoogleMessage('No events to export.')
      } else {
        const parts = []
        if (exported > 0) parts.push(`Exported ${exported} new event${exported !== 1 ? 's' : ''}`)
        if (updated > 0) parts.push(`updated ${updated} rescheduled event${updated !== 1 ? 's' : ''}`)
        setGoogleMessage(parts.join(', ') + ' on Google Calendar.')
      }
    } catch (error) {
      setGoogleMessage(error.message || 'Export to Google failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">StudySync</h1>
          <span className="app-subtitle">Click a slot to add · Drag events to reschedule</span>
        </div>
        <div className="header-actions">
          <span className="header-email">{user?.email}</span>
          <div className="google-dropdown" ref={googleMenuRef}>
            <button
              className={`btn-secondary google-dropdown-trigger ${googleCalendarConnected ? 'connected' : ''}`}
              onClick={() => setGoogleMenuOpen(o => !o)}
              disabled={googleLoading}
            >
              Google Calendar {googleCalendarConnected ? '●' : '○'} ▾
            </button>
            {googleMenuOpen && (
              <div className="google-dropdown-menu">
                <button
                  className="dropdown-item"
                  onClick={() => { setGoogleMenuOpen(false); handleGoogleConnectToggle() }}
                >
                  {googleCalendarConnected ? 'Disconnect' : 'Connect'}
                </button>
                {googleCalendarConnected && (
                  <>
                    <div className="dropdown-divider" />
                    <button
                      className="dropdown-item"
                      onClick={() => { setGoogleMenuOpen(false); handleImportGoogle() }}
                    >
                      Import from Google
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => { setGoogleMenuOpen(false); handleExportGoogle() }}
                    >
                      Export to Google
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <button className="btn-secondary" onClick={() => navigate('/schedule')}>
            View Schedule List
          </button>
          <button className="btn-primary" onClick={() => setShowGenerate(true)}>
            ✦ Generate Study Plan
          </button>
          <button className="btn-signout" onClick={signOut}>Sign Out</button>
        </div>
      </header>

      <main className="calendar-container">
        {googleMessage && (
          <div className="google-status-banner">{googleMessage}</div>
        )}
        <WeekCalendar
          onEventClick={setEditingEvent}
          onSlotClick={slot => setEditingEvent(slot)}
        />
      </main>

      {editingEvent !== null && (
        <EventModal
          event={editingEvent}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditingEvent(null)}
        />
      )}

      {showGenerate && <GenerateModal onClose={() => setShowGenerate(false)} />}
    </div>
  )
}
