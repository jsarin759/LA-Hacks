function toMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours * 60 + minutes
}

function buildPrompt({ existingEvents, subjects, timeRange, selectedDays }) {
  return `You are a scheduling assistant.
Create a weekly study schedule as JSON only.

Rules:
- Return ONLY valid JSON. No markdown, no prose.
- Use this exact shape:
  { "schedule": [ { "title": string, "day": number, "startTime": "HH:MM", "endTime": "HH:MM", "type": "study", "generated": true } ] }
- day is 0=Sun through 6=Sat.
- Do not overlap existing events.
- Respect the time window ${timeRange.start} to ${timeRange.end}.
- Only schedule on these days: ${selectedDays.join(', ')}.
- Try to distribute time across subjects.
- Prefer sessions between 30 and 90 minutes.

Existing events:
${JSON.stringify(existingEvents, null, 2)}

Subjects:
${JSON.stringify(subjects, null, 2)}`
}

function extractJson(text) {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed)
  }

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Gemini response did not contain JSON')
  }

  return JSON.parse(trimmed.slice(start, end + 1))
}

function normalizeScheduleItem(item) {
  return {
    title: String(item.title ?? 'Study Session'),
    day: Number(item.day),
    startTime: String(item.startTime),
    endTime: String(item.endTime),
    type: 'study',
    generated: true,
  }
}

export async function generateStudyScheduleWithGemini({ existingEvents, subjects, timeRange, selectedDays }) {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY')
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
  const prompt = buildPrompt({ existingEvents, subjects, timeRange, selectedDays })

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Gemini request failed: ${response.status} ${message}`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    throw new Error('Gemini returned an empty schedule response')
  }

  const parsed = extractJson(text)
  const schedule = Array.isArray(parsed.schedule) ? parsed.schedule.map(normalizeScheduleItem) : []

  return schedule.filter(item => {
    const start = toMinutes(item.startTime)
    const end = toMinutes(item.endTime)
    return Number.isFinite(item.day) && end > start && end - start >= 30
  })
}
