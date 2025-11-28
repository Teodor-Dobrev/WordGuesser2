import { useState } from 'react'
import type { FormEvent } from 'react'

interface NameGateProps {
  onEnter: (name: string) => void
  title?: string
  description?: string
  onBack?: () => void
}

export function NameGate({ onEnter, title = 'Word Guesser', description = 'Enter your name to jump into a round.', onBack }: NameGateProps) {
  const [name, setName] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length === 0) {
      return
    }
    onEnter(trimmed)
  }

  return (
    <div className="panel name-gate">
      <h1>{title}</h1>
      <p className="muted">{description}</p>
      <form onSubmit={handleSubmit} className="name-form">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Player name"
          autoComplete="name"
          aria-label="Player name"
        />
        <button type="submit" className="primary">Play</button>
      </form>
      {onBack && (
        <button type="button" className="link-button" onClick={onBack}>
          Back to project picker
        </button>
      )}
    </div>
  )
}
