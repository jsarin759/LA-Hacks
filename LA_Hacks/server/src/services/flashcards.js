function normalizeSubject(subject) {
  const hours = Number(subject.hours) || 0

  return {
    name: String(subject.name ?? '').trim(),
    notes: String(subject.notes ?? '').trim(),
    hours,
    cardCount: Math.max(4, Math.min(10, Math.round(hours * 2))),
  }
}

function buildPrompt({ subjects }) {
  return `You are a study assistant.
Create flashcards as JSON only.

Rules:
- Return ONLY valid JSON. No markdown, no prose.
- Use this exact shape:
  { "flashcardsBySubject": [ { "subject": string, "cards": [ { "front": string, "back": string, "hint": string, "difficulty": "easy" | "medium" | "hard" } ] } ] }
- Create exactly the requested number of cards for each subject.
- Make every card specific to the class and the provided notes.
- Keep fronts concise and backs direct.
- Cover definitions, concepts, formulas, examples, and common mistakes when relevant.
- Avoid duplicates and avoid generic filler if class-specific material is available.

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

function normalizeFlashcard(card) {
  return {
    front: String(card.front ?? '').trim(),
    back: String(card.back ?? '').trim(),
    hint: String(card.hint ?? '').trim(),
    difficulty: ['easy', 'medium', 'hard'].includes(card.difficulty) ? card.difficulty : 'medium',
  }
}

function normalizeFlashcardGroup(group) {
  return {
    subject: String(group.subject ?? 'Study Set').trim(),
    cards: Array.isArray(group.cards) ? group.cards.map(normalizeFlashcard).filter(card => card.front && card.back) : [],
  }
}

function generateLocalFlashcards(subjects) {
  return subjects.map(subject => {
    const cards = Array.from({ length: subject.cardCount }, (_, index) => {
      const number = index + 1
      const difficulty = number <= 2 ? 'easy' : number <= 5 ? 'medium' : 'hard'

      if (subject.notes) {
        return {
          front: `${subject.name}: ${subject.notes} - key idea ${number}?`,
          back: `Explain the main idea, definition, or process from ${subject.notes}.`,
          hint: subject.notes,
          difficulty,
        }
      }

      return {
        front: `${subject.name}: important concept ${number}?`,
        back: `Explain one core definition, process, or example from ${subject.name}.`,
        hint: subject.name,
        difficulty,
      }
    })

    return { subject: subject.name, cards }
  })
}

export async function generateFlashcardsWithGemini({ subjects }) {
  const normalizedSubjects = subjects.map(normalizeSubject)
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return generateLocalFlashcards(normalizedSubjects)
  }

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview'
    const prompt = buildPrompt({ subjects: normalizedSubjects })

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
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
      throw new Error('Gemini returned an empty flashcard response')
    }

    const parsed = extractJson(text)
    const flashcards = Array.isArray(parsed.flashcardsBySubject)
      ? parsed.flashcardsBySubject.map(normalizeFlashcardGroup)
      : []

    return flashcards.length ? flashcards : generateLocalFlashcards(normalizedSubjects)
  } catch {
    return generateLocalFlashcards(normalizedSubjects)
  }
}