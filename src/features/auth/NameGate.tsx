import { useState } from 'react'
import type { FormEvent } from 'react'

interface NameGateProps {
  onEnter: (name: string) => void
}

export function NameGate({ onEnter }: NameGateProps) {
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
      <h1>Word Guesser</h1>
      <p className="muted">Enter your name to jump into a round.</p>
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
    </div>
  )
}
