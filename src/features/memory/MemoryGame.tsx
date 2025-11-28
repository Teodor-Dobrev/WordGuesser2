import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getPlayerHighScore, recordPlayerHighScore } from '../leaderboard/storage'

const MEMORY_GAME_ID = 'memorymatch'
const TIMER_RESOLUTION_MS = 100

const EMOJI_POOL = [
  '🍎',
  '🚀',
  '🌟',
  '🎈',
  '🐍',
  '🧠',
  '⚡',
  '🍩',
  '🌮',
  '🎮',
  '🧊',
  '🐱',
  '🐶',
  '🦄',
  '🌈',
  '🔥',
  '❄️',
  '🍇',
  '✨',
  '🎧',
  '🎲',
  '📚',
  '🛸',
  '🧩',
  '⚙️',
  '🪐',
  '🍀',
  '🍣',
  '🎹',
  '🚁',
]

const DIFFICULTY_PRESETS = {
  easy: { label: 'Easy', pairs: 6, columns: 4 },
  medium: { label: 'Medium', pairs: 8, columns: 4 },
  hard: { label: 'Hard', pairs: 10, columns: 5 },
  challenge: { label: 'Are you sure!?', pairs: 12, columns: 6 },
  champion: { label: 'OK, you memory champion...', pairs: 15, columns: 6 },
} as const

type DifficultyKey = keyof typeof DIFFICULTY_PRESETS

type GameStatus = 'idle' | 'running' | 'ended'

interface Card {
  id: number
  emoji: string
  matched: boolean
  flipped: boolean
}

interface MemoryGameProps {
  playerName: string
  onResetPlayer: () => void
  onSwitchProject?: () => void
}

function shuffleArray<T>(input: T[]): T[] {
  const copy = [...input]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }
  return copy
}

function createDeck(pairCount: number): Card[] {
  const selection = shuffleArray(EMOJI_POOL).slice(0, pairCount)
  const deck = selection.flatMap((emoji, pairIndex) => {
    return [
      { id: pairIndex * 2, emoji, matched: false, flipped: false },
      { id: pairIndex * 2 + 1, emoji, matched: false, flipped: false },
    ]
  })
  return shuffleArray(deck)
}

function formatTime(ms: number) {
  if (!ms) return '—'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const tenths = Math.floor((ms % 1000) / 100)
  const minutesLabel = minutes > 0 ? `${minutes}:` : ''
  const secondsLabel = minutes > 0 ? seconds.toString().padStart(2, '0') : seconds.toString()
  return `${minutesLabel}${secondsLabel}.${tenths}s`
}

export function MemoryGame({ playerName, onResetPlayer, onSwitchProject }: MemoryGameProps) {
  const [difficulty, setDifficulty] = useState<DifficultyKey>('medium')
  const totalPairs = DIFFICULTY_PRESETS[difficulty].pairs
  const columns = DIFFICULTY_PRESETS[difficulty].columns
  const [cards, setCards] = useState<Card[]>(() => createDeck(totalPairs))
  const [status, setStatus] = useState<GameStatus>('idle')
  const [firstPickId, setFirstPickId] = useState<number | null>(null)
  const [lockBoard, setLockBoard] = useState(false)
  const [matchesFound, setMatchesFound] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [bestTimeMs, setBestTimeMs] = useState(() => getPlayerHighScore(MEMORY_GAME_ID, playerName))

  const timerRef = useRef<number | null>(null)
  const statusRef = useRef<GameStatus>(status)
  const elapsedRef = useRef(elapsedMs)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    elapsedRef.current = elapsedMs
  }, [elapsedMs])

  useEffect(() => {
    setBestTimeMs(getPlayerHighScore(MEMORY_GAME_ID, playerName))
  }, [playerName])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    stopTimer()
    timerRef.current = window.setInterval(() => {
      setElapsedMs((prev) => prev + TIMER_RESOLUTION_MS)
    }, TIMER_RESOLUTION_MS)
  }, [stopTimer])

  const resetBoard = useCallback(
    (presetKey: DifficultyKey) => {
      const deck = createDeck(DIFFICULTY_PRESETS[presetKey].pairs)
      setCards(deck)
      setFirstPickId(null)
      setLockBoard(false)
      setMatchesFound(0)
      setAttempts(0)
      setElapsedMs(0)
    },
    [],
  )

  const startGame = useCallback(() => {
    stopTimer()
    resetBoard(difficulty)
    setStatus('running')
    statusRef.current = 'running'
    startTimer()
  }, [difficulty, resetBoard, startTimer, stopTimer])

  const startIfIdle = useCallback(() => {
    if (statusRef.current !== 'idle') return
    stopTimer()
    setElapsedMs(0)
    setStatus('running')
    statusRef.current = 'running'
    startTimer()
  }, [startTimer, stopTimer])

  const finishGame = useCallback(() => {
    if (statusRef.current !== 'running') return
    stopTimer()
    setStatus('ended')
    statusRef.current = 'ended'
    const finalTime = elapsedRef.current
    if (finalTime > 0) {
      const updated = recordPlayerHighScore(MEMORY_GAME_ID, playerName, finalTime, { mode: 'min' })
      setBestTimeMs(updated)
    }
  }, [playerName, stopTimer])

  const handleStart = useCallback(() => {
    if (statusRef.current === 'running') return
    startGame()
  }, [startGame])

  const handleRestart = useCallback(() => {
    const isRunning = statusRef.current === 'running'
    const confirmRestart = !isRunning || window.confirm('Restart the round? Current progress will be lost.')
    if (!confirmRestart) return
    startGame()
  }, [startGame])

  const handleStop = useCallback(() => {
    if (statusRef.current !== 'running') return
    const confirmStop = window.confirm('Stop the current round? Your time will not be recorded.')
    if (!confirmStop) return
    stopTimer()
    setStatus('ended')
    statusRef.current = 'ended'
    setLockBoard(false)
    setFirstPickId(null)
  }, [stopTimer])

  useEffect(() => {
    return () => {
      stopTimer()
    }
  }, [stopTimer])

  useEffect(() => {
    if (statusRef.current === 'running') {
      stopTimer()
      startTimer()
    }
  }, [difficulty, startTimer, stopTimer])

  useEffect(() => {
    if (statusRef.current !== 'running') {
      resetBoard(difficulty)
    }
  }, [difficulty, resetBoard])

  const handleCardClick = useCallback(
    (card: Card) => {
      if (statusRef.current === 'ended') return
      if (statusRef.current === 'idle') {
        startIfIdle()
      }
      if (statusRef.current !== 'running') return
      if (lockBoard) return
      if (card.flipped || card.matched) return
      setCards((prev) => prev.map((entry) => (entry.id === card.id ? { ...entry, flipped: true } : entry)))
      if (firstPickId === null) {
        setFirstPickId(card.id)
        return
      }
      const firstCard = cards.find((entry) => entry.id === firstPickId)
      if (!firstCard) {
        setFirstPickId(null)
        return
      }
      setLockBoard(true)
      setAttempts((prev) => prev + 1)
      const isMatch = firstCard.emoji === card.emoji
      if (isMatch) {
        window.setTimeout(() => {
          setCards((prev) =>
            prev.map((entry) =>
              entry.id === card.id || entry.id === firstCard.id ? { ...entry, matched: true } : entry,
            ),
          )
          setMatchesFound((prev) => {
            const next = prev + 1
            if (next === totalPairs) {
              window.setTimeout(() => {
                finishGame()
              }, 300)
            }
            return next
          })
          setFirstPickId(null)
          setLockBoard(false)
        }, 320)
      } else {
        window.setTimeout(() => {
          setCards((prev) =>
            prev.map((entry) =>
              entry.id === card.id || entry.id === firstCard.id ? { ...entry, flipped: false } : entry,
            ),
          )
          setFirstPickId(null)
          setLockBoard(false)
        }, 850)
      }
    },
    [cards, finishGame, firstPickId, lockBoard, startIfIdle, totalPairs],
  )

  const statusLabel = status === 'running' ? 'Running' : status === 'ended' ? 'Finished' : 'Ready'
  const timeLabel = formatTime(elapsedMs)
  const bestTimeLabel = bestTimeMs > 0 ? formatTime(bestTimeMs) : '—'

  const gridStyle = useMemo(
    () => ({ gridTemplateColumns: `repeat(${columns}, minmax(70px, 1fr))`, gridAutoRows: 'minmax(70px, 1fr)' }),
    [columns],
  )

  return (
    <div className="panel memory-game">
      <header className="memory-header">
        <div>
          <p className="eyebrow">Emoji Memory Match</p>
          <h1>Match the Emoji</h1>
          <p>Flip two panels at a time, remember their positions, and clear the board as fast as you can.</p>
        </div>
        <div className="memory-scoreboard">
          <span className="status-chip">Status: {statusLabel}</span>
          <span className="status-chip">Time: {timeLabel}</span>
          <span className="status-chip">Matches: {matchesFound}/{totalPairs}</span>
          <span className="status-chip">Attempts: {attempts}</span>
          <span className="status-chip">Best time: {bestTimeLabel}</span>
        </div>
      </header>
      <div className="memory-toolbar">
        <label className="stacked">
          <span>Difficulty</span>
          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as DifficultyKey)}
            disabled={status === 'running'}
          >
            {Object.entries(DIFFICULTY_PRESETS).map(([key, preset]) => (
              <option key={key} value={key}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <p className="memory-hint">{DIFFICULTY_PRESETS[difficulty].pairs * 2} panels · {totalPairs} pairs</p>
      </div>
      <div className="memory-grid" style={gridStyle}>
        {cards.map((card) => {
          const flipped = card.flipped || card.matched
          const cardClass = ['memory-card']
          if (flipped) cardClass.push('flipped')
          if (card.matched) cardClass.push('matched')
          const interactionLocked = card.matched || lockBoard || status === 'ended'
          return (
            <div key={card.id} className={cardClass.join(' ')}>
              <button
                type="button"
                className="memory-card-button"
                onClick={() => handleCardClick(card)}
                aria-disabled={interactionLocked}
              >
                <span className="memory-card-inner">
                  <span className="memory-card-face front">🎴</span>
                  <span className="memory-card-face back">{card.emoji}</span>
                </span>
              </button>
            </div>
          )
        })}
      </div>
      <div className="controls-row memory-controls">
        <button type="button" className="action success" onClick={handleStart} disabled={status === 'running'}>
          Start
        </button>
        <button type="button" className="action" onClick={handleRestart}>
          Restart
        </button>
        <button type="button" className="action danger" onClick={handleStop} disabled={status !== 'running'}>
          Stop
        </button>
        <button type="button" className="action" onClick={onResetPlayer}>
          Change name
        </button>
        {onSwitchProject && (
          <button type="button" className="action" onClick={onSwitchProject}>
            Switch project
          </button>
        )}
      </div>
      <p className="memory-tip">Tip: Restart after a win to chase a faster time. Best time tracks per player on this device.</p>
    </div>
  )
}
