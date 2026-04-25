const DEFAULT_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function createLocalPracticeTests(subjects) {
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
    const count = Math.max(4, Math.min(10, Math.round((Number(subject.hours) || 0) * 2)))
    const noteText = String(subject.notes ?? '').trim()

    return {
      subject: subject.name,
      questions: Array.from({ length: count }, (_, index) => {
        const number = index + 1
        const difficulty = number <= 2 ? 'easy' : number <= 5 ? 'medium' : 'hard'
        const correctAnswer = noteText
          ? `The core idea of ${noteText}.`
          : `One core definition, process, or example from ${subject.name}.`
        const { choices, correctChoiceIndex } = buildChoices(subject, correctAnswer, number)

        return noteText
          ? {
              question: `${subject.name}: which choice best describes ${noteText}?`,
              choices,
              correctChoiceIndex,
              answer: correctAnswer,
              explanation: `Focus on the core idea of ${noteText} and how it connects to ${subject.name}.`,
              difficulty,
            }
          : {
              question: `${subject.name}: which answer best matches a key concept ${number}?`,
              choices,
              correctChoiceIndex,
              answer: correctAnswer,
              explanation: `Use this to practice recalling a key idea from ${subject.name}.`,
              difficulty,
            }
      }),
    }
  })
}

export async function generatePracticeTests(subjects) {
  try {
    const response = await fetch(`${DEFAULT_API_URL}/api/generate-practice-tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjects }),
    })

    if (!response.ok) {
      throw new Error(`Practice test request failed: ${response.status}`)
    }

    const data = await response.json()
    return Array.isArray(data.practiceTests) ? data.practiceTests : []
  } catch (error) {
    console.warn('Practice test generation failed:', error)
    return createLocalPracticeTests(subjects)
  }
}