import { Router } from 'express'
import { generateStudyScheduleWithGemini } from '../services/gemini.js'
import { generateLocalStudySchedule } from '../services/localSchedule.js'
import { generateFlashcardsWithGemini } from '../services/flashcards.js'
import { validateScheduleInput } from '../utils/validateScheduleInput.js'
import { validateFlashcardInput } from '../utils/validateFlashcardsInput.js'

export const scheduleRouter = Router()

scheduleRouter.post('/generate-schedule', async (req, res, next) => {
  try {
    const { valid, error, value } = validateScheduleInput(req.body)

    if (!valid) {
      return res.status(400).json({ error })
    }

    console.log(
      `[schedule] generating for ${value.subjects.length} subjects across ${value.selectedDays.length} days`
    )

    try {
      const schedule = await generateStudyScheduleWithGemini(value)
      console.log(`[schedule] completed via gemini with ${schedule.length} sessions`)
      return res.json({ schedule, source: 'gemini' })
    } catch (generationError) {
      console.warn('Gemini generation failed, using local fallback:', generationError.message)
      const fallbackSchedule = generateLocalStudySchedule(
        value.existingEvents,
        value.subjects,
        value.timeRange,
        value.selectedDays
      )
      console.log(`[schedule] completed via local-fallback with ${fallbackSchedule.length} sessions`)
      return res.json({ schedule: fallbackSchedule, source: 'local-fallback' })
    }
  } catch (error) {
    next(error)
  }
})

scheduleRouter.post('/generate-flashcards', async (req, res, next) => {
  try {
    const { valid, error, value } = validateFlashcardInput(req.body)

    if (!valid) {
      return res.status(400).json({ error })
    }

    console.log(`[flashcards] generating for ${value.subjects.length} subjects`)

    try {
      const flashcards = await generateFlashcardsWithGemini(value)
      console.log(`[flashcards] completed via gemini with ${flashcards.length} subject groups`)
      return res.json({ flashcards, source: 'gemini' })
    } catch (generationError) {
      console.warn('Gemini flashcard generation failed, using local fallback:', generationError.message)
      return res.json({ flashcards: [], source: 'local-fallback' })
    }
  } catch (error) {
    next(error)
  }
})
