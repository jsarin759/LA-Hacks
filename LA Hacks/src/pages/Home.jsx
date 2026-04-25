import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WeekCalendar from '../components/WeekCalendar'
import EventModal from '../components/EventModal'
import GenerateModal from '../components/GenerateModal'
import { useSchedule } from '../context/ScheduleContext'

export default function Home() {
  const navigate = useNavigate()
  const { addEvent, updateEvent, removeEvent } = useSchedule()
  const [editingEvent, setEditingEvent] = useState(null)
  const [showGenerate, setShowGenerate] = useState(false)

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

  return (
    <div className="page">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">StudySync</h1>
          <span className="app-subtitle">Click a slot to add · Drag events to reschedule</span>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => navigate('/schedule')}>
            Manage Schedule
          </button>
          <button className="btn-primary" onClick={() => setShowGenerate(true)}>
            ✦ Generate Study Plan
          </button>
        </div>
      </header>

      <main className="calendar-container">
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
