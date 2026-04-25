import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function getConnectedKey(userId) {
  return `google-connected:${userId}`
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user?.id) {
      setGoogleCalendarConnected(false)
      return
    }

    const isConnected = localStorage.getItem(getConnectedKey(user.id)) === 'true'
    setGoogleCalendarConnected(isConnected)
  }, [user?.id])

  const setGoogleConnected = (connected) => {
    if (user?.id) {
      localStorage.setItem(getConnectedKey(user.id), connected ? 'true' : 'false')
    }
    setGoogleCalendarConnected(connected)
  }

  const signUp = (email, password) =>
    supabase.auth.signUp({ email, password })

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  const connectGoogleCalendar = async () => {
    if (!user?.id) {
      throw new Error('You must be signed in first')
    }

    const redirectUri = `${window.location.origin}/callback`
    const response = await fetch(
      `${API_URL}/api/google/oauth-url?userId=${encodeURIComponent(user.id)}&redirectUri=${encodeURIComponent(redirectUri)}`
    )

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to start Google OAuth')
    }

    const data = await response.json()
    window.location.assign(data.url)
  }

  const completeGoogleOAuth = async (code) => {
    if (!user?.id) {
      throw new Error('You must be signed in first')
    }

    const response = await fetch(`${API_URL}/api/google/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        code,
        redirectUri: `${window.location.origin}/callback`,
      }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to exchange Google OAuth code')
    }

    setGoogleConnected(true)
  }

  const disconnectGoogleCalendar = async () => {
    if (!user?.id) {
      return
    }

    await fetch(`${API_URL}/api/google/disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    })

    setGoogleConnected(false)
  }

  const fetchGoogleEvents = async (timeMin, timeMax) => {
    if (!user?.id) {
      throw new Error('You must be signed in first')
    }

    const query = new URLSearchParams({ userId: user.id })
    if (timeMin) query.set('timeMin', timeMin)
    if (timeMax) query.set('timeMax', timeMax)

    const response = await fetch(`${API_URL}/api/google/events?${query.toString()}`)
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch Google Calendar events')
    }

    return data.events || []
  }

  const createGoogleEvent = async (event) => {
    if (!user?.id) {
      throw new Error('You must be signed in first')
    }

    const response = await fetch(`${API_URL}/api/google/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, event }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create Google Calendar event')
    }

    return data.event
  }

  const updateGoogleEvent = async (eventId, event) => {
    if (!user?.id) {
      throw new Error('You must be signed in first')
    }

    const response = await fetch(`${API_URL}/api/google/events/${encodeURIComponent(eventId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, event }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update Google Calendar event')
    }

    return data.event
  }

  const deleteGoogleEvent = async (eventId) => {
    if (!user?.id) {
      throw new Error('You must be signed in first')
    }

    const query = new URLSearchParams({ userId: user.id })
    const response = await fetch(
      `${API_URL}/api/google/events/${encodeURIComponent(eventId)}?${query.toString()}`,
      { method: 'DELETE' }
    )

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete Google Calendar event')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signOut,
        googleCalendarConnected,
        connectGoogleCalendar,
        completeGoogleOAuth,
        disconnectGoogleCalendar,
        fetchGoogleEvents,
        createGoogleEvent,
        updateGoogleEvent,
        deleteGoogleEvent,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
