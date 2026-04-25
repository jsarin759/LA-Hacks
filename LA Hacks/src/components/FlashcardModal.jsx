import { useState } from 'react'
import { generateFlashcards } from '../utils/flashcardGenerator'

export default function FlashcardModal({ onClose }) {
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [flashcards, setFlashcards] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  const handleGenerate = async () => {
    if (!subject.trim()) {
      setError('Please enter a subject')
      return
    }

    setError('')
    setIsGenerating(true)

    try {
      const result = await generateFlashcards([
        {
          name: subject.trim(),
          hours: 1,
          notes: topic.trim(),
        },
      ])
      setFlashcards(result)
      setCurrentCardIndex(0)
      setIsFlipped(false)
    } catch (err) {
      setError(err?.message || 'Failed to generate flashcards')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    setSubject('')
    setTopic('')
    setFlashcards(null)
    setError('')
    setCurrentCardIndex(0)
    setIsFlipped(false)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const handleNextCard = () => {
    if (flashcards && flashcards.length > 0) {
      const totalCards = flashcards.reduce((sum, group) => sum + group.cards.length, 0)
      setCurrentCardIndex((prev) => (prev + 1) % totalCards)
      setIsFlipped(false)
    }
  }

  const handlePrevCard = () => {
    if (flashcards && flashcards.length > 0) {
      const totalCards = flashcards.reduce((sum, group) => sum + group.cards.length, 0)
      setCurrentCardIndex((prev) => (prev - 1 + totalCards) % totalCards)
      setIsFlipped(false)
    }
  }

  const getCurrentCard = () => {
    if (!flashcards || flashcards.length === 0) return null
    let cardCount = 0
    for (const group of flashcards) {
      if (currentCardIndex < cardCount + group.cards.length) {
        return group.cards[currentCardIndex - cardCount]
      }
      cardCount += group.cards.length
    }
    return null
  }

  const getTotalCards = () => {
    if (!flashcards) return 0
    return flashcards.reduce((sum, group) => sum + group.cards.length, 0)
  }

  const currentCard = getCurrentCard()
  const totalCards = getTotalCards()

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Generate Flashcards</h2>
          <button className="close-btn" type="button" onClick={handleClose}>✕</button>
        </div>

        <div className="generate-body">
          {!flashcards ? (
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
                  placeholder="Describe what topics you want flashcards for (e.g., 'Chapters 3-5, photosynthesis, mitochondria' or leave blank for general flashcards)"
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
                  Flashcards will be generated using AI to help you study this subject.
                </p>
              </section>
            </>
          ) : (
            <>
              <section style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 16px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.06em' }}>
                  Card {currentCardIndex + 1} of {totalCards}
                </p>

                {currentCard ? (
                  <>
                    <div
                      className="flashcard-viewer"
                      onClick={() => setIsFlipped(!isFlipped)}
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
                      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.01)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
                        {isFlipped ? 'Back' : 'Front'}
                      </span>
                      <p style={{
                        fontSize: '18px',
                        fontWeight: '500',
                        color: 'var(--text)',
                        margin: '0',
                        lineHeight: '1.6',
                        textAlign: 'center',
                      }}>
                        {isFlipped ? currentCard.back : currentCard.front}
                      </p>
                      {isFlipped && currentCard.hint && (
                        <span style={{
                          marginTop: '16px',
                          fontSize: '12px',
                          color: 'var(--muted)',
                          fontStyle: 'italic',
                        }}>
                          Hint: {currentCard.hint}
                        </span>
                      )}
                      <span style={{ marginTop: '24px', fontSize: '12px', color: 'var(--muted)', fontWeight: '600' }}>
                        Click to flip
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setIsFlipped(!isFlipped)}
                        style={{ padding: '8px 16px', fontSize: '14px' }}
                      >
                        🔄 Flip Card
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="no-slots">No flashcards available.</p>
                )}
              </section>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" type="button" onClick={handleClose}>
            {flashcards ? 'Close' : 'Cancel'}
          </button>
          <div className="modal-actions-right">
            {flashcards && totalCards > 0 && (
              <>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handlePrevCard}
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleNextCard}
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                >
                  Next →
                </button>
              </>
            )}
            {flashcards && (
              <button className="btn-secondary" type="button" onClick={handleReset}>
                Generate More
              </button>
            )}
            {!flashcards && (
              <button
                className="btn-primary"
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !subject.trim()}
              >
                {isGenerating ? 'Generating...' : '✦ Generate Flashcards'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
