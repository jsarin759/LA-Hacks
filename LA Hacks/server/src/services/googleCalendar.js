import { google } from 'googleapis'

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
]

// NOTE: This in-memory store is for local development only.
// Move tokens to a database (encrypted at rest) before production.
const tokenStore = new Map()

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
  const base = getBaseOAuthClient()

  if (!redirectUri) {
    return base
  }

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  )
}

function getStoredTokens(userId) {
  return tokenStore.get(userId) || null
}

function setStoredTokens(userId, tokens) {
  tokenStore.set(userId, tokens)
}

export function isGoogleConnected(userId) {
  return tokenStore.has(userId)
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

  const existing = getStoredTokens(userId)
  const merged = {
    ...existing,
    ...tokens,
    refresh_token: tokens.refresh_token || existing?.refresh_token,
  }

  setStoredTokens(userId, merged)
  return { connected: true }
}

function getAuthorizedCalendar(userId) {
  const tokens = getStoredTokens(userId)

  if (!tokens) {
    throw new Error('Google calendar is not connected for this user')
  }

  const oauth2Client = getBaseOAuthClient()
  oauth2Client.setCredentials(tokens)

  return {
    calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
    oauth2Client,
  }
}

export async function listCalendarEvents({ userId, timeMin, timeMax }) {
  const { calendar } = getAuthorizedCalendar(userId)

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
  const { calendar } = getAuthorizedCalendar(userId)

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  })

  return response.data
}

export async function updateCalendarEvent({ userId, eventId, event }) {
  const { calendar } = getAuthorizedCalendar(userId)

  const response = await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    requestBody: event,
  })

  return response.data
}

export async function deleteCalendarEvent({ userId, eventId }) {
  const { calendar } = getAuthorizedCalendar(userId)

  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
  })

  return { ok: true }
}

export async function disconnectGoogle({ userId }) {
  const tokens = getStoredTokens(userId)
  const oauth2Client = getBaseOAuthClient()

  if (tokens?.access_token) {
    try {
      await oauth2Client.revokeToken(tokens.access_token)
    } catch {
      // If token is already invalid, continue clearing local state.
    }
  }

  tokenStore.delete(userId)
  return { disconnected: true }
}
