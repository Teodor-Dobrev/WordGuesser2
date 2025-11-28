import type { LeaderboardEntry } from '../game/types'
import { formatDuration } from '../game/constants'

interface LeaderboardModalProps {
  open: boolean
  entries: LeaderboardEntry[]
  timerSeconds: number
  highlightId?: string
  onClose: () => void
}

export function LeaderboardModal({ open, entries, timerSeconds, highlightId, onClose }: LeaderboardModalProps) {
  if (!open) return null

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h2>Leaderboard · {formatDuration(timerSeconds)}</h2>
        {entries.length === 0 ? (
          <p>No entries yet for this timer length.</p>
        ) : (
          <ol className="leaderboard-list">
            {entries.map((entry, index) => (
              <li
                key={entry.id}
                className="leaderboard-item"
                aria-current={entry.id === highlightId}
                style={entry.id === highlightId ? { fontWeight: 700, color: '#2563eb' } : undefined}
              >
                <span>
                  #{index + 1} · {entry.player}
                </span>
                <span>
                  {entry.points} pts · {entry.words} words
                </span>
              </li>
            ))}
          </ol>
        )}
        <div className="modal-actions">
          <button className="action" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
