import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const ScheduleContext = createContext()

const pad = n => String(n).padStart(2, '0')

// Returns the local UTC offset as a string like "-07:00" or "+05:30"
function localTzOffset() {
  const off = -new Date().getTimezoneOffset() // minutes, positive = UTC+
  const sign = off >= 0 ? '+' : '-'
  const abs = Math.abs(off)
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

// DB row → JS object
// new Date() works correctly here because toDB now stores the local timezone offset,
// so the TIMESTAMPTZ in Supabase represents the right UTC instant.
function fromDB(row) {
  const start = new Date(row.start_at)
  const end = new Date(row.end_at)
  return {
    id: row.id,
    title: row.event_title,
    type: row.event_type,
    startAt: row.start_at,
    endAt: row.end_at,
    date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    day: start.getDay(),
    startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
  }
}

// JS object → DB row
function toDB(event) {
  const row = {}
  if (event.title !== undefined) row.event_title = event.title
  if (event.type !== undefined) row.event_type = event.type
  const tz = localTzOffset()
  if (event.date !== undefined && event.startTime !== undefined)
    row.start_at = `${event.date}T${event.startTime}:00${tz}`
  if (event.date !== undefined && event.endTime !== undefined)
    row.end_at = `${event.date}T${event.endTime}:00${tz}`
  return row
}

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export function ScheduleProvider({ children }) {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setEvents([])
      setLoading(false)
      return
    }
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('start_at')
      if (!error && data) setEvents(data.map(fromDB))
      setLoading(false)
    }
    load()
  }, [user?.id])

  const addEvent = async (event) => {
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('events')
      .insert({ ...toDB(event), user_id: userId })
      .select()
      .single()
    if (error) { console.error('addEvent failed:', error.message); return }
    setEvents(prev => [...prev, { ...fromDB(data), generated: event.generated ?? false }])
  }

  const addEvents = async (eventsToAdd) => {
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('events')
      .insert(eventsToAdd.map(e => ({ ...toDB(e), user_id: userId })))
      .select()
    if (error) { console.error('addEvents failed:', error.message); return }
    const mapped = data.map((row, i) => ({ ...fromDB(row), generated: eventsToAdd[i]?.generated ?? false }))
    setEvents(prev => [...prev, ...mapped])
  }

  const updateEvent = async (id, updates) => {
    const existing = events.find(e => e.id === id)
    if (!existing) return
    const merged = { ...existing, ...updates }
    const start_at = `${merged.date}T${merged.startTime}:00`
    const end_at = `${merged.date}T${merged.endTime}:00`
    setEvents(prev => prev.map(e => e.id === id ? { ...merged, startAt: start_at, endAt: end_at } : e))
    await supabase.from('events').update(toDB(merged)).eq('id', id)
  }

  const removeEvent = async (id) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    await supabase.from('events').delete().eq('id', id)
  }

  const replaceAllEvents = async (eventsToSet) => {
    const userId = await getUserId()
    if (!userId) return

    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('user_id', userId)

    if (deleteError) {
      console.error('replaceAllEvents delete failed:', deleteError.message)
      return
    }

    if (!Array.isArray(eventsToSet) || eventsToSet.length === 0) {
      setEvents([])
      return
    }

    const { data, error: insertError } = await supabase
      .from('events')
      .insert(eventsToSet.map(e => ({ ...toDB(e), user_id: userId })))
      .select()

    if (insertError) {
      console.error('replaceAllEvents insert failed:', insertError.message)
      return
    }

    setEvents(data.map(fromDB))
  }

  const clearGeneratedEvents = async () => {
    setEvents(prev => prev.filter(e => !e.generated))
  }

  return (
    <ScheduleContext.Provider value={{ events, loading, addEvent, addEvents, updateEvent, removeEvent, replaceAllEvents, clearGeneratedEvents }}>
      {children}
    </ScheduleContext.Provider>
  )
}

export const useSchedule = () => useContext(ScheduleContext)
