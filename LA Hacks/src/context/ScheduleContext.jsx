import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

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
        .order('day')
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
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
    await supabase.from('events').update(toDB(updates)).eq('id', id)
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
