import { Router } from 'express'
import { generateStudyScheduleWithGemini } from '../services/gemini.js'
import { generateLocalStudySchedule } from '../services/localSchedule.js'
import { validateScheduleInput } from '../utils/validateScheduleInput.js'

export const scheduleRouter = Router()

scheduleRouter.post('/generate-schedule', async (req, res, next) => {
  try {
    const { valid, error, value } = validateScheduleInput(req.body)

    if (!valid) {
      return res.status(400).json({ error })
    }

    try {
      const schedule = await generateStudyScheduleWithGemini(value)
      return res.json({ schedule, source: 'gemini' })
    } catch (generationError) {
      console.warn('Gemini generation failed, using local fallback:', generationError.message)
      const fallbackSchedule = generateLocalStudySchedule(
        value.existingEvents,
        value.subjects,
        value.timeRange,
        value.selectedDays
      )
      return res.json({ schedule: fallbackSchedule, source: 'local-fallback' })
    }
  } catch (error) {
    next(error)
  }
})
