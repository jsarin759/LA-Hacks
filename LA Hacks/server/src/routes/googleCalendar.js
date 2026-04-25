import { Router } from 'express'
import {
  buildGoogleOAuthUrl,
  createCalendarEvent,
  deleteCalendarEvent,
  disconnectGoogle,
  exchangeCodeForTokens,
  isGoogleConnected,
  listCalendarEvents,
  updateCalendarEvent,
} from '../services/googleCalendar.js'

export const googleCalendarRouter = Router()

function getRequiredUserId(req) {
  const userId = req.body?.userId || req.query.userId

  if (!userId || typeof userId !== 'string') {
    const error = new Error('Missing userId')
    error.statusCode = 400
    throw error
  }

  return userId
}

googleCalendarRouter.get('/oauth-url', (req, res, next) => {
  try {
    const userId = getRequiredUserId(req)
    const redirectUri = typeof req.query.redirectUri === 'string' ? req.query.redirectUri : undefined
    const url = buildGoogleOAuthUrl({ userId, redirectUri })
    res.json({ url })
  } catch (error) {
    next(error)
  }
})

googleCalendarRouter.post('/exchange', async (req, res, next) => {
  try {
    const userId = getRequiredUserId(req)
    const { code, redirectUri } = req.body

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing code' })
    }

    await exchangeCodeForTokens({ userId, code, redirectUri })
    res.json({ connected: true })
  } catch (error) {
    next(error)
  }
})

googleCalendarRouter.get('/status', (req, res, next) => {
  try {
    const userId = getRequiredUserId(req)
    res.json({ connected: isGoogleConnected(userId) })
  } catch (error) {
    next(error)
  }
})

googleCalendarRouter.get('/events', async (req, res, next) => {
  try {
    const userId = getRequiredUserId(req)
    const now = new Date()
    const defaultEnd = new Date(now)
    defaultEnd.setDate(defaultEnd.getDate() + 14)

    const timeMin = typeof req.query.timeMin === 'string' ? req.query.timeMin : now.toISOString()
    const timeMax = typeof req.query.timeMax === 'string' ? req.query.timeMax : defaultEnd.toISOString()

    const events = await listCalendarEvents({ userId, timeMin, timeMax })
    res.json({ events })
  } catch (error) {
    next(error)
  }
})

googleCalendarRouter.post('/events', async (req, res, next) => {
  try {
    const userId = getRequiredUserId(req)
    const { event } = req.body

    if (!event || typeof event !== 'object') {
      return res.status(400).json({ error: 'Missing event payload' })
    }

    const created = await createCalendarEvent({ userId, event })
    res.status(201).json({ event: created })
  } catch (error) {
    next(error)
  }
})

googleCalendarRouter.patch('/events/:eventId', async (req, res, next) => {
  try {
    const userId = getRequiredUserId(req)
    const { eventId } = req.params
    const { event } = req.body

    if (!event || typeof event !== 'object') {
      return res.status(400).json({ error: 'Missing event payload' })
    }

    const updated = await updateCalendarEvent({ userId, eventId, event })
    res.json({ event: updated })
  } catch (error) {
    next(error)
  }
})

googleCalendarRouter.delete('/events/:eventId', async (req, res, next) => {
  try {
    const userId = getRequiredUserId(req)
    const { eventId } = req.params

    await deleteCalendarEvent({ userId, eventId })
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

googleCalendarRouter.post('/disconnect', async (req, res, next) => {
  try {
    const userId = getRequiredUserId(req)
    await disconnectGoogle({ userId })
    res.json({ disconnected: true })
  } catch (error) {
    next(error)
  }
})
