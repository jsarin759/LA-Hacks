const DEFAULT_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function createLocalFlashcards(subjects) {
  return subjects.map(subject => {
    const count = Math.max(4, Math.min(10, Math.round((Number(subject.hours) || 0) * 2)))
    const noteText = String(subject.notes ?? '').trim()

    return {
      subject: subject.name,
      cards: Array.from({ length: count }, (_, index) => {
        const number = index + 1
        const difficulty = number <= 2 ? 'easy' : number <= 5 ? 'medium' : 'hard'

        return noteText
          ? {
              front: `${subject.name}: ${noteText} - key idea ${number}?`,
              back: `Explain the main idea, definition, or process from ${noteText}.`,
              hint: noteText,
              difficulty,
            }
          : {
              front: `${subject.name}: important concept ${number}?`,
              back: `Explain one core definition, process, or example from ${subject.name}.`,
              hint: subject.name,
              difficulty,
            }
      }),
    }
  })
}

export async function generateFlashcards(subjects) {
  try {
    const response = await fetch(`${DEFAULT_API_URL}/api/generate-flashcards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjects }),
    })

    if (!response.ok) {
      throw new Error(`Flashcard request failed: ${response.status}`)
    }

    const data = await response.json()
    return Array.isArray(data.flashcards) ? data.flashcards : []
  } catch (error) {
    console.warn('Flashcard generation failed:', error)
    return createLocalFlashcards(subjects)
  }
}