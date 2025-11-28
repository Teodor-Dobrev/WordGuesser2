import type { GuessedWord } from '../game/types'

interface EndOfGameModalProps {
  open: boolean
  words: GuessedWord[]
  highScore?: number
  onClose: () => void
}

export function EndOfGameModal({ open, words, highScore, onClose }: EndOfGameModalProps) {
  if (!open) return null

  // Compute round total from the words array to ensure accuracy even if external
  // `points` state changed after the modal was requested.
  const roundTotal = words.reduce((s, w) => s + (w.points || 0), 0)

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h2>Round Summary</h2>
        <p>
          {words.length} words · {roundTotal} points
        </p>
        {typeof highScore !== 'undefined' ? (
          <p>
            High Score (for you, this session): <strong>{highScore}</strong>
          </p>
        ) : null}
        <div className="guessed-panel" style={{ maxHeight: '50vh' }}>
          {words.length === 0 ? (
            <p>No correct guesses this round. Next one will be better!</p>
          ) : (
            words.map((word) => (
              <div key={word.word + word.timestamp} className="guessed-word">
                <strong>
                  <span>{word.word}</span>
                  <span>{word.points} pts</span>
                </strong>
                {word.definition?.short ? <p className="definition">{word.definition.short}</p> : null}
              </div>
            ))
          )}
        </div>
        <div className="modal-actions">
          <button className="action" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
