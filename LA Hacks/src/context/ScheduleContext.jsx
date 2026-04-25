import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ScheduleContext = createContext()

// DB row → JS object
function fromDB(row) {
  return {
    id: row.id,
    title: row.event_title,
    type: row.event_type,
    day: row.day,
    startTime: row.event_starttime,
    endTime: row.event_endtime,
  }
}

// JS object → DB row (only includes defined fields so partial updates are safe)
function toDB(event) {
  const row = {}
  if (event.title !== undefined)     row.event_title = event.title
  if (event.type !== undefined)      row.event_type = event.type
  if (event.day !== undefined)       row.day = event.day
  if (event.startTime !== undefined) row.event_starttime = event.startTime
  if (event.endTime !== undefined)   row.event_endtime = event.endTime
  return row
}

export function ScheduleProvider({ children }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('events')
      .select('*')
      .order('day')
      .then(({ data, error }) => {
        if (!error && data) setEvents(data.map(fromDB))
        setLoading(false)
      })
  }, [])

  const addEvent = async (event) => {
    const { data, error } = await supabase
      .from('events')
      .insert(toDB(event))
      .select()
      .single()
    if (error) { console.error('addEvent failed:', error.message); return }
    setEvents(prev => [...prev, { ...fromDB(data), generated: event.generated ?? false }])
  }

  const addEvents = async (eventsToAdd) => {
    const { data, error } = await supabase
      .from('events')
      .insert(eventsToAdd.map(toDB))
      .select()
    if (error) { console.error('addEvents failed:', error.message); return }
    const mapped = data.map((row, i) => ({ ...fromDB(row), generated: eventsToAdd[i]?.generated ?? false }))
    setEvents(prev => [...prev, ...mapped])
  }

  const updateEvent = async (id, updates) => {
    // Optimistically update UI, then sync to DB
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
    await supabase.from('events').update(toDB(updates)).eq('id', id)
  }

  const removeEvent = async (id) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    await supabase.from('events').delete().eq('id', id)
  }

  const clearGeneratedEvents = async () => {
    setEvents(prev => prev.filter(e => !e.generated))
    await supabase.from('events').delete().eq('generated', true)
  }

  return (
    <ScheduleContext.Provider value={{ events, loading, addEvent, addEvents, updateEvent, removeEvent, clearGeneratedEvents }}>
      {children}
    </ScheduleContext.Provider>
  )
}

export const useSchedule = () => useContext(ScheduleContext)
