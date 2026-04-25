import { useState } from 'react'
import { generatePracticeTests } from '../utils/practiceTestGenerator'

function flattenQuestions(practiceTests) {
  return practiceTests.flatMap(group =>
    group.questions.map(question => ({
      ...question,
      subject: group.subject,
    }))
  )
}

export default function PracticeTestModal({ onClose }) {
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [practiceTests, setPracticeTests] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState(null)
  const [isChecked, setIsChecked] = useState(false)
  const [responses, setResponses] = useState({})
  const [showSummary, setShowSummary] = useState(false)

  const handleGenerate = async () => {
    if (!subject.trim()) {
      setError('Please enter a subject')
      return
    }

    setError('')
    setIsGenerating(true)

    try {
      const result = await generatePracticeTests([
        {
          name: subject.trim(),
          hours: 1,
          notes: topic.trim(),
        },
      ])
      setPracticeTests(result)
      setCurrentQuestionIndex(0)
      setSelectedChoiceIndex(null)
      setIsChecked(false)
      setResponses({})
      setShowSummary(false)
    } catch (err) {
      setError(err?.message || 'Failed to generate practice tests')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    setSubject('')
    setTopic('')
    setPracticeTests(null)
    setError('')
    setCurrentQuestionIndex(0)
    setSelectedChoiceIndex(null)
    setIsChecked(false)
    setResponses({})
    setShowSummary(false)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const handleNextQuestion = () => {
    if (!practiceTests) return
    const questions = flattenQuestions(practiceTests)
    if (questions.length === 0) return

    if (selectedChoiceIndex !== null && isChecked) {
      setResponses(prev => ({
        ...prev,
        [currentQuestionIndex]: {
          selectedChoiceIndex,
          correctChoiceIndex,
          isCorrect: selectedChoiceIndex === correctChoiceIndex,
        },
      }))
    }

    if (currentQuestionIndex >= questions.length - 1) {
      setShowSummary(true)
      return
    }

    setCurrentQuestionIndex(prev => prev + 1)
    setSelectedChoiceIndex(null)
    setIsChecked(false)
  }

  const handlePrevQuestion = () => {
    if (!practiceTests) return

    if (showSummary) {
      setShowSummary(false)
      setCurrentQuestionIndex(Math.max(questions.length - 1, 0))
      setSelectedChoiceIndex(null)
      setIsChecked(false)
      return
    }

    const questions = flattenQuestions(practiceTests)
    if (questions.length === 0) return

    setCurrentQuestionIndex(prev => Math.max(prev - 1, 0))
    setSelectedChoiceIndex(null)
    setIsChecked(false)
  }

  const handleCheckAnswer = () => {
    if (selectedChoiceIndex === null) return
    setIsChecked(true)
  }

  const questions = practiceTests ? flattenQuestions(practiceTests) : []
  const currentQuestion = questions[currentQuestionIndex]
  const totalQuestions = questions.length
  const correctChoiceIndex = Number.isInteger(currentQuestion?.correctChoiceIndex)
    ? currentQuestion.correctChoiceIndex
    : 0
  const selectedIsCorrect = isChecked && selectedChoiceIndex === correctChoiceIndex
  const answeredCount = Object.keys(responses).length
  const correctCount = Object.values(responses).filter(response => response.isCorrect).length
  const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Generate Practice Tests</h2>
          <button className="close-btn" type="button" onClick={handleClose}>✕</button>
        </div>

        <div className="generate-body">
          {!practiceTests ? (
            <>
              <section>
                <h3>Subject</h3>
                <input
                  type="text"
                  placeholder="e.g., Biology, Calculus, History"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  autoFocus
                />
              </section>

              <section>
                <h3>Topic or Focus Area</h3>
                <textarea
                  placeholder="Describe what you want tested on (e.g., 'Chapters 3-5, photosynthesis, mitochondria' or leave blank for general practice questions)"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    font: 'inherit',
                    color: 'var(--text)',
                    background: 'var(--surface)',
                    outline: 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'var(--primary)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'var(--border)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </section>

              {error && <p className="form-error">{error}</p>}

              <section style={{ marginTop: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 12px' }}>
                  Practice tests will be generated using AI to help you check your understanding.
                </p>
              </section>
            </>
          ) : showSummary ? (
            <section style={{ textAlign: 'center', marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 16px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.06em' }}>
                Test Complete
              </p>

              <div
                className="flashcard-viewer"
                style={{
                  minHeight: '280px',
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(99,102,241,0.04))',
                  border: '2px solid var(--border)',
                  borderRadius: '16px',
                  padding: '40px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: '24px',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
                  Score Summary
                </span>
                <p style={{ fontSize: '42px', fontWeight: '800', color: 'var(--text)', margin: '0 0 8px', lineHeight: '1' }}>
                  {correctCount}/{totalQuestions}
                </p>
                <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--muted)', margin: '0 0 18px' }}>
                  {scorePercent}% correct
                </p>
                <div style={{ display: 'grid', gap: '8px', width: '100%', maxWidth: '360px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(99,102,241,0.06)', borderRadius: '10px' }}>
                    <span style={{ color: 'var(--muted)' }}>Answered</span>
                    <strong>{answeredCount}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(16,185,129,0.08)', borderRadius: '10px' }}>
                    <span style={{ color: 'var(--muted)' }}>Correct</span>
                    <strong>{correctCount}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: '10px' }}>
                    <span style={{ color: 'var(--muted)' }}>Missed</span>
                    <strong>{Math.max(totalQuestions - correctCount, 0)}</strong>
                  </div>
                </div>
                <span style={{ marginTop: '24px', fontSize: '12px', color: 'var(--muted)', fontWeight: '600' }}>
                  Review the questions or generate a fresh practice test to try again.
                </span>
              </div>
            </section>
          ) : (
            <section style={{ textAlign: 'center', marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 16px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.06em' }}>
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>

              {currentQuestion ? (
                <>
                  <div
                    className="flashcard-viewer"
                    style={{
                      minHeight: '280px',
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.02))',
                      border: '2px solid var(--border)',
                      borderRadius: '16px',
                      padding: '40px 32px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      marginBottom: '24px',
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
                      Multiple Choice
                    </span>
                    <p style={{
                      fontSize: '18px',
                      fontWeight: '500',
                      color: 'var(--text)',
                      margin: '0',
                      lineHeight: '1.6',
                      textAlign: 'center',
                    }}>
                      {currentQuestion.question}
                    </p>
                    <div style={{ width: '100%', display: 'grid', gap: '10px', marginTop: '24px' }}>
                      {(currentQuestion.choices || []).map((choice, index) => {
                        const isSelected = selectedChoiceIndex === index
                        const isCorrectChoice = index === correctChoiceIndex
                        let borderColor = 'var(--border)'
                        let background = 'var(--surface)'

                        if (isChecked && isCorrectChoice) {
                          borderColor = 'var(--success)'
                          background = 'rgba(16,185,129,0.08)'
                        } else if (isChecked && isSelected && !isCorrectChoice) {
                          borderColor = 'var(--red)'
                          background = 'rgba(239,68,68,0.08)'
                        } else if (isSelected) {
                          borderColor = 'var(--primary)'
                          background = 'rgba(99,102,241,0.08)'
                        }

                        return (
                          <button
                            key={choice}
                            type="button"
                            onClick={() => {
                              setSelectedChoiceIndex(index)
                              setIsChecked(false)
                            }}
                            style={{
                              textAlign: 'left',
                              width: '100%',
                              padding: '12px 14px',
                              borderRadius: '12px',
                              border: `1px solid ${borderColor}`,
                              background,
                              color: 'var(--text)',
                              font: 'inherit',
                              cursor: 'pointer',
                              transition: 'border-color 0.15s, background 0.15s, transform 0.15s',
                            }}
                          >
                            <strong style={{ color: 'var(--primary)', marginRight: '8px' }}>
                              {String.fromCharCode(65 + index)}.
                            </strong>
                            {choice}
                          </button>
                        )
                      })}
                    </div>
                    {isChecked && currentQuestion.explanation && (
                      <span style={{
                        marginTop: '16px',
                        fontSize: '12px',
                        color: selectedIsCorrect ? 'var(--success)' : 'var(--red)',
                        fontStyle: 'italic',
                        maxWidth: '420px',
                        fontWeight: '600',
                      }}>
                        {selectedIsCorrect ? 'Correct.' : 'Incorrect.'} {currentQuestion.explanation}
                      </span>
                    )}
                    <span style={{ marginTop: '24px', fontSize: '12px', color: 'var(--muted)', fontWeight: '600' }}>
                      Select an answer, then check it like a real exam question
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleCheckAnswer}
                      disabled={selectedChoiceIndex === null}
                      style={{ padding: '8px 16px', fontSize: '14px' }}
                    >
                      Check Answer
                    </button>
                    <span style={{
                      padding: '8px 12px',
                      borderRadius: '999px',
                      background: 'rgba(99,102,241,0.08)',
                      color: 'var(--primary)',
                      fontSize: '12px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      {currentQuestion.difficulty || 'medium'}
                    </span>
                  </div>
                </>
              ) : (
                <p className="no-slots">No practice questions were generated.</p>
              )}
            </section>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" type="button" onClick={handleClose}>
            {practiceTests ? (showSummary ? 'Close' : 'Close') : 'Cancel'}
          </button>
          <div className="modal-actions-right">
            {showSummary ? (
              <button
                className="btn-secondary"
                type="button"
                onClick={() => {
                  setShowSummary(false)
                  setCurrentQuestionIndex(Math.max(questions.length - 1, 0))
                }}
              >
                Review Last Question
              </button>
            ) : null}
            {practiceTests && questions.length > 0 && (
              <>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handlePrevQuestion}
                  disabled={!showSummary && currentQuestionIndex === 0}
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleNextQuestion}
                  disabled={!showSummary && currentQuestionIndex >= questions.length - 1 && selectedChoiceIndex === null}
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                >
                  {showSummary ? 'Finish' : currentQuestionIndex >= questions.length - 1 ? 'Finish Test' : 'Next →'}
                </button>
              </>
            )}
            {practiceTests && (
              <button className="btn-secondary" type="button" onClick={handleReset}>
                Generate More
              </button>
            )}
            {!practiceTests && (
              <button
                className="btn-primary"
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !subject.trim()}
              >
                {isGenerating ? 'Generating...' : '✦ Generate Practice Tests'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}