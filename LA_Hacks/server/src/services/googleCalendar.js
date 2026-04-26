import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
]

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

async function getStoredTokens(userId) {
  const { data, error } = await getSupabase()
    .from('google_tokens')
    .select('tokens')
    .eq('user_id', userId)
    .single()
  if (error || !data) return null
  return data.tokens
}

async function setStoredTokens(userId, tokens) {
  await getSupabase()
    .from('google_tokens')
    .upsert({ user_id: userId, tokens, updated_at: new Date().toISOString() })
}

async function deleteStoredTokens(userId) {
  await getSupabase()
    .from('google_tokens')
    .delete()
    .eq('user_id', userId)
}

function getBaseOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REDIRECT_URI')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

function getOAuthClient(redirectUri) {
  if (!redirectUri) return getBaseOAuthClient()
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  )
}

export async function isGoogleConnected(userId) {
  const tokens = await getStoredTokens(userId)
  return tokens !== null
}

export function buildGoogleOAuthUrl({ userId, redirectUri }) {
  const oauth2Client = getOAuthClient(redirectUri)
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state: userId,
    include_granted_scopes: true,
  })
}

export async function exchangeCodeForTokens({ userId, code, redirectUri }) {
  const oauth2Client = getOAuthClient(redirectUri)
  const { tokens } = await oauth2Client.getToken(code)

  const existing = await getStoredTokens(userId)
  const merged = {
    ...existing,
    ...tokens,
    refresh_token: tokens.refresh_token || existing?.refresh_token,
  }

  await setStoredTokens(userId, merged)
  return { connected: true }
}

async function getAuthorizedCalendar(userId) {
  const tokens = await getStoredTokens(userId)
  if (!tokens) throw new Error('Google calendar is not connected for this user')

  const oauth2Client = getBaseOAuthClient()
  oauth2Client.setCredentials(tokens)

  // Persist refreshed tokens automatically
  oauth2Client.on('tokens', async (refreshed) => {
    const current = await getStoredTokens(userId)
    await setStoredTokens(userId, {
      ...current,
      ...refreshed,
      refresh_token: refreshed.refresh_token || current?.refresh_token,
    })
  })

  return {
    calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
    oauth2Client,
  }
}

export async function listCalendarEvents({ userId, timeMin, timeMax }) {
  const { calendar } = await getAuthorizedCalendar(userId)
  const response = await calendar.events.list({
    calendarId: 'primary',
    singleEvents: true,
    orderBy: 'startTime',
    timeMin,
    timeMax,
    maxResults: 250,
  })
  return response.data.items || []
}

export async function createCalendarEvent({ userId, event }) {
  const { calendar } = await getAuthorizedCalendar(userId)
  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  })
  return response.data
}

export async function updateCalendarEvent({ userId, eventId, event }) {
  const { calendar } = await getAuthorizedCalendar(userId)
  const response = await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    requestBody: event,
  })
  return response.data
}

export async function deleteCalendarEvent({ userId, eventId }) {
  const { calendar } = await getAuthorizedCalendar(userId)
  await calendar.events.delete({ calendarId: 'primary', eventId })
  return { ok: true }
}

export async function disconnectGoogle({ userId }) {
  const tokens = await getStoredTokens(userId)
  const oauth2Client = getBaseOAuthClient()

  if (tokens?.access_token) {
    try {
      await oauth2Client.revokeToken(tokens.access_token)
    } catch {
      // Token already invalid — continue.
    }
  }

  await deleteStoredTokens(userId)
  return { disconnected: true }
}
