function clampQuestionCount(value) {
  const count = Number(value)
  if (!Number.isFinite(count) || count <= 0) return 0
  return Math.max(4, Math.min(10, Math.round(count)))
}

export function validatePracticeTestInput(body) {
  const subjects = Array.isArray(body?.subjects) ? body.subjects : []

  const cleanedSubjects = subjects
    .filter(subject => typeof subject?.name === 'string' && subject.name.trim())
    .map(subject => ({
      name: subject.name.trim(),
      hours: Number(subject.hours) || 0,
      notes: typeof subject.notes === 'string' ? subject.notes.trim() : '',
      questionCount: clampQuestionCount(subject.questionCount || Math.round((Number(subject.hours) || 0) * 2)),
    }))
    .filter(subject => subject.hours > 0)

  if (!cleanedSubjects.length) {
    return { valid: false, error: 'subjects must include at least one named subject with hours greater than 0', value: null }
  }

  return {
    valid: true,
    error: null,
    value: {
      subjects: cleanedSubjects,
    },
  }
}