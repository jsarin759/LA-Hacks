import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WeekCalendar from '../components/WeekCalendar'
import EventModal from '../components/EventModal'
import GenerateModal from '../components/GenerateModal'
import { useSchedule } from '../context/ScheduleContext'
import { useAuth } from '../context/AuthContext'

function toTime(value) {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
}

function nextDateForWeekday(weekday) {
  const now = new Date()
  const next = new Date(now)
  next.setHours(0, 0, 0, 0)

  const today = now.getDay()
  let daysAhead = weekday - today
  if (daysAhead < 0) {
    daysAhead += 7
  }

  next.setDate(next.getDate() + daysAhead)
  return next
}

function withTime(baseDate, hhmm) {
  const [hours, minutes] = hhmm.split(':').map(Number)
  const next = new Date(baseDate)
  next.setHours(hours, minutes, 0, 0)
  return next
}

function mapGoogleEventToLocal(event) {
  const startDateTime = event?.start?.dateTime
  const endDateTime = event?.end?.dateTime

  if (!startDateTime || !endDateTime) {
    return null
  }

  const start = new Date(startDateTime)
  const end = new Date(endDateTime)

  return {
    title: event.summary || 'Google Event',
    type: 'class',
    day: start.getDay(),
    startTime: toTime(start),
    endTime: toTime(end),
  }
}

export default function Home() {
  const navigate = useNavigate()
  const { events, addEvent, updateEvent, removeEvent, replaceAllEvents } = useSchedule()
  const {
    user,
    signOut,
    googleCalendarConnected,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    fetchGoogleEvents,
    createGoogleEvent,
  } = useAuth()
  const [editingEvent, setEditingEvent] = useState(null)
  const [showGenerate, setShowGenerate] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleMessage, setGoogleMessage] = useState('')

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

      await replaceAllEvents(mapped)

      if (mapped.length === 0) {
        setGoogleMessage('Schedule cleared. No timed Google events found in the next 7 days.')
      } else {
        setGoogleMessage(`Schedule replaced with ${mapped.length} Google events.`)
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
      let exported = 0

      for (const event of events) {
        const date = nextDateForWeekday(event.day)
        const start = withTime(date, event.startTime)
        const end = withTime(date, event.endTime)

        await createGoogleEvent({
          summary: event.title,
          description: 'Exported from StudySync',
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
        })

        exported += 1
      }

      setGoogleMessage(`Exported ${exported} events to Google Calendar.`)
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
          <button className="btn-secondary" onClick={handleGoogleConnectToggle} disabled={googleLoading}>
            {googleCalendarConnected ? 'Disconnect Google' : 'Connect Google'}
          </button>
          <button className="btn-secondary" onClick={handleImportGoogle} disabled={!googleCalendarConnected || googleLoading}>
            Import Google
          </button>
          <button className="btn-secondary" onClick={handleExportGoogle} disabled={!googleCalendarConnected || googleLoading}>
            Export Google
          </button>
          <button className="btn-secondary" onClick={() => navigate('/schedule')}>
            Manage Schedule
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
