import type { GuessedWord } from '../game/types'

interface EndOfGameModalProps {
  open: boolean
  words: GuessedWord[]
  totalPoints: number
  onClose: () => void
}

export function EndOfGameModal({ open, words, totalPoints, onClose }: EndOfGameModalProps) {
  if (!open) return null

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h2>Round Summary</h2>
        <p>
          {words.length} words · {totalPoints} points
        </p>
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
