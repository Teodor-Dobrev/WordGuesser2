import type { GuessedWord } from './types'

interface GuessedWordsPanelProps {
  words: GuessedWord[]
}

export function GuessedWordsPanel({ words }: GuessedWordsPanelProps) {
  return (
    <aside className="guessed-panel">
      <h2>Guessed words</h2>
      {words.length === 0 ? (
        <p>No guesses yet. Build a word to get started.</p>
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
    </aside>
  )
}
