function normalizeSubject(subject) {
  const hours = Number(subject.hours) || 0

  return {
    name: String(subject.name ?? '').trim(),
    notes: String(subject.notes ?? '').trim(),
    hours,
    questionCount: Math.max(4, Math.min(10, Math.round(hours * 2))),
  }
}

function buildPrompt({ subjects }) {
  return `You are a study assistant.
Create practice tests as JSON only.

Rules:
- Return ONLY valid JSON. No markdown, no prose.
- Use this exact shape:
  { "practiceTestsBySubject": [ { "subject": string, "questions": [ { "question": string, "choices": [string, string, string, string], "correctChoiceIndex": number, "answer": string, "explanation": string, "difficulty": "easy" | "medium" | "hard" } ] } ] }
- Create exactly the requested number of questions for each subject.
- Make every question specific to the class and the provided notes.
- Make every question multiple choice with exactly 4 answer choices.
- Use one clearly correct answer and three plausible distractors.
- Keep questions concise and answers direct.
- Make the correct option not always be in the same position.
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

function normalizeQuestion(question) {
  const choices = Array.isArray(question.choices)
    ? question.choices.map(choice => String(choice ?? '').trim()).filter(Boolean).slice(0, 4)
    : []

  return {
    question: String(question.question ?? '').trim(),
    choices,
    correctChoiceIndex: Number.isInteger(question.correctChoiceIndex) ? question.correctChoiceIndex : 0,
    answer: String(question.answer ?? '').trim(),
    explanation: String(question.explanation ?? '').trim(),
    difficulty: ['easy', 'medium', 'hard'].includes(question.difficulty) ? question.difficulty : 'medium',
  }
}

function normalizeQuestionGroup(group) {
  return {
    subject: String(group.subject ?? 'Practice Test').trim(),
    questions: Array.isArray(group.questions)
      ? group.questions.map(normalizeQuestion).filter(question => question.question && question.answer)
      : [],
  }
}

function generateLocalPracticeTests(subjects) {
  const buildChoices = (subject, correctAnswer, questionNumber) => {
    const distractorSets = [
      [
        `A definition that sounds related to ${subject.name}`,
        `An example that does not fully match ${subject.name}`,
        `A detail from another topic in ${subject.name}`,
      ],
      [
        `A partially correct explanation of ${subject.name}`,
        `A common mistake students make about ${subject.name}`,
        `An unrelated but believable concept`,
      ],
      [
        `A broad summary without the key detail`,
        `A reversed cause and effect relationship`,
        `A memorized fact from a different chapter`,
      ],
      [
        `A distractor that sounds technical but is wrong`,
        `A confusingly similar term`,
        `A generic answer that misses the point`,
      ],
    ]

    const distractors = distractorSets[questionNumber % distractorSets.length]
    const correctChoiceIndex = questionNumber % 4
    const choices = [...distractors]
    choices.splice(correctChoiceIndex, 0, correctAnswer)
    return { choices, correctChoiceIndex }
  }

  return subjects.map(subject => {
    const questions = Array.from({ length: subject.questionCount }, (_, index) => {
      const number = index + 1
      const difficulty = number <= 2 ? 'easy' : number <= 5 ? 'medium' : 'hard'

      if (subject.notes) {
        const answer = `The best answer is the core idea of ${subject.notes}.`
        const { choices, correctChoiceIndex } = buildChoices(subject, answer, number)

        return {
          question: `${subject.name}: which choice best describes ${subject.notes}?`,
          choices,
          correctChoiceIndex,
          answer,
          explanation: `Focus on the core idea of ${subject.notes} and how it connects to ${subject.name}.`,
          difficulty,
        }
      }

      const answer = `One core definition, process, or example from ${subject.name}.`
      const { choices, correctChoiceIndex } = buildChoices(subject, answer, number)

      return {
        question: `${subject.name}: which answer best matches a key concept ${number}?`,
        choices,
        correctChoiceIndex,
        answer,
        explanation: `Use this to practice recalling a key idea from ${subject.name}.`,
        difficulty,
      }
    })

    return { subject: subject.name, questions }
  })
}

export async function generatePracticeTestsWithGemini({ subjects }) {
  const normalizedSubjects = subjects.map(normalizeSubject)
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return generateLocalPracticeTests(normalizedSubjects)
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
      throw new Error('Gemini returned an empty practice test response')
    }

    const parsed = extractJson(text)
    const practiceTests = Array.isArray(parsed.practiceTestsBySubject)
      ? parsed.practiceTestsBySubject.map(normalizeQuestionGroup)
      : []

    return practiceTests.length ? practiceTests : generateLocalPracticeTests(normalizedSubjects)
  } catch {
    return generateLocalPracticeTests(normalizedSubjects)
  }
}