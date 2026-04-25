import { createContext, useContext, useState, useEffect } from 'react'

const ScheduleContext = createContext()

export function ScheduleProvider({ children }) {
  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem('lahacks-events')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('lahacks-events', JSON.stringify(events))
  }, [events])

  const addEvent = (event) => {
    const newEvent = { ...event, id: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}` }
    setEvents(prev => [...prev, newEvent])
    return newEvent
  }

  const addEvents = (eventsToAdd) => {
    const newEvents = eventsToAdd.map(event => ({
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`
    }))
    setEvents(prev => [...prev, ...newEvents])
  }

  const updateEvent = (id, updates) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
  }

  const removeEvent = (id) => {
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const clearGeneratedEvents = () => {
    setEvents(prev => prev.filter(e => !e.generated))
  }

  return (
    <ScheduleContext.Provider value={{ events, addEvent, addEvents, updateEvent, removeEvent, clearGeneratedEvents }}>
      {children}
    </ScheduleContext.Provider>
  )
}

export const useSchedule = () => useContext(ScheduleContext)
