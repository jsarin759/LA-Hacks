const DAYS = [0, 1, 2, 3, 4, 5, 6]

function isTimeString(value) {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)
}

export function validateScheduleInput(body) {
  const existingEvents = Array.isArray(body?.existingEvents) ? body.existingEvents : []
  const subjects = Array.isArray(body?.subjects) ? body.subjects : []
  const selectedDays = Array.isArray(body?.selectedDays) ? body.selectedDays : []
  const timeRange = body?.timeRange ?? {}

  if (!subjects.length) {
    return { valid: false, error: 'subjects are required', value: null }
  }

  if (!isTimeString(timeRange.start) || !isTimeString(timeRange.end)) {
    return { valid: false, error: 'timeRange.start and timeRange.end must be HH:MM strings', value: null }
  }

  if (!selectedDays.length || selectedDays.some(day => !DAYS.includes(day))) {
    return { valid: false, error: 'selectedDays must contain values from 0 to 6', value: null }
  }

  const cleanedSubjects = subjects
    .filter(subject => typeof subject?.name === 'string' && subject.name.trim())
    .map(subject => ({
      name: subject.name.trim(),
      hours: Number(subject.hours) || 0,
    }))
    .filter(subject => subject.hours > 0)

  if (!cleanedSubjects.length) {
    return { valid: false, error: 'subjects must include at least one named subject with hours greater than 0', value: null }
  }

  return {
    valid: true,
    error: null,
    value: {
      existingEvents,
      subjects: cleanedSubjects,
      timeRange: {
        start: timeRange.start,
        end: timeRange.end,
      },
      selectedDays,
    },
  }
}
