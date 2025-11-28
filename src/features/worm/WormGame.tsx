import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getPlayerHighScore, recordPlayerHighScore } from '../leaderboard/storage'

const GRID_SIZE = 18
const DIFFICULTY_PRESETS = {
  easy: { label: 'Easy', speed: 220 },
  normal: { label: 'Normal', speed: 150 },
  hard: { label: 'Hard', speed: 110 },
  frantic: { label: 'Frantic', speed: 80 },
} as const
const DEFAULT_DIRECTION: Direction = 'right'
const WORM_GAME_ID = 'wormgame'

type Direction = 'up' | 'down' | 'left' | 'right'

interface Coord {
  x: number
  y: number
}

interface WormGameProps {
  playerName: string
  onResetPlayer: () => void
  onSwitchProject?: () => void
}

function createInitialSnake(): Coord[] {
  const mid = Math.floor(GRID_SIZE / 2)
  return [
    { x: mid + 1, y: mid },
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
  ]
}

function coordKey(coord: Coord) {
  return `${coord.x}:${coord.y}`
}

function spawnApple(occupied: Coord[]): Coord {
  const occupiedSet = new Set(occupied.map(coordKey))
  const maxCells = GRID_SIZE * GRID_SIZE
  if (occupied.length >= maxCells) {
    return occupied[0] ?? { x: 0, y: 0 }
  }
  let candidate: Coord
  do {
    candidate = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    }
  } while (occupiedSet.has(coordKey(candidate)))
  return candidate
}

function moveHead(head: Coord, direction: Direction): Coord {
  switch (direction) {
    case 'up':
      return { x: head.x, y: head.y - 1 }
    case 'down':
      return { x: head.x, y: head.y + 1 }
    case 'left':
      return { x: head.x - 1, y: head.y }
    case 'right':
    default:
      return { x: head.x + 1, y: head.y }
  }
}

function isOpposite(a: Direction, b: Direction) {
  return (
    (a === 'up' && b === 'down') ||
    (a === 'down' && b === 'up') ||
    (a === 'left' && b === 'right') ||
    (a === 'right' && b === 'left')
  )
}

export function WormGame({ playerName, onResetPlayer, onSwitchProject }: WormGameProps) {
  const [snake, setSnake] = useState<Coord[]>(() => createInitialSnake())
  const [apple, setApple] = useState<Coord>(() => spawnApple(createInitialSnake()))
  const [status, setStatus] = useState<'idle' | 'running' | 'ended'>('idle')
  const [direction, setDirection] = useState<Direction>(DEFAULT_DIRECTION)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => getPlayerHighScore(WORM_GAME_ID, playerName))
  const [difficulty, setDifficulty] = useState<keyof typeof DIFFICULTY_PRESETS>('normal')
  const tickDuration = DIFFICULTY_PRESETS[difficulty].speed

  const snakeRef = useRef(snake)
  const appleRef = useRef(apple)
  const directionRef = useRef(direction)
  const statusRef = useRef(status)
  const timerRef = useRef<number | null>(null)
  const scoreRef = useRef(score)

  useEffect(() => {
    snakeRef.current = snake
  }, [snake])

  useEffect(() => {
    appleRef.current = apple
  }, [apple])

  useEffect(() => {
    directionRef.current = direction
  }, [direction])

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    scoreRef.current = score
  }, [score])

  const stopLoop = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const finalizeScore = useCallback(() => {
    const finalScore = scoreRef.current
    const updated = recordPlayerHighScore(WORM_GAME_ID, playerName, finalScore)
    setHighScore(updated)
  }, [playerName])

  const finishRound = useCallback(() => {
    if (statusRef.current !== 'running') return
    stopLoop()
    setStatus('ended')
    statusRef.current = 'ended'
    finalizeScore()
  }, [finalizeScore, stopLoop])

  const advanceGame = useCallback(() => {
    if (statusRef.current !== 'running') return
    const currentSnake = snakeRef.current
    const currentDirection = directionRef.current
    const currentApple = appleRef.current
    const head = currentSnake[0]
    const nextHead = moveHead(head, currentDirection)
    const hitWall = nextHead.x < 0 || nextHead.x >= GRID_SIZE || nextHead.y < 0 || nextHead.y >= GRID_SIZE
    if (hitWall) {
      finishRound()
      return
    }
    const nextKey = coordKey(nextHead)
    const bodySet = new Set(currentSnake.slice(0, -1).map(coordKey))
    if (bodySet.has(nextKey)) {
      finishRound()
      return
    }
    const ateApple = nextHead.x === currentApple.x && nextHead.y === currentApple.y
    const nextSnake = ateApple ? [nextHead, ...currentSnake] : [nextHead, ...currentSnake.slice(0, -1)]
    snakeRef.current = nextSnake
    setSnake(nextSnake)
    if (ateApple) {
      setScore((prev) => {
        const nextScore = prev + 1
        scoreRef.current = nextScore
        return nextScore
      })
      const freshApple = spawnApple(nextSnake)
      appleRef.current = freshApple
      setApple(freshApple)
    }
  }, [finishRound])

  const startLoop = useCallback(() => {
    stopLoop()
    timerRef.current = window.setInterval(advanceGame, tickDuration)
  }, [advanceGame, stopLoop, tickDuration])

  const beginRound = useCallback(() => {
    stopLoop()
    const freshSnake = createInitialSnake()
    const freshApple = spawnApple(freshSnake)
    snakeRef.current = freshSnake
    setSnake(freshSnake)
    appleRef.current = freshApple
    setApple(freshApple)
    directionRef.current = DEFAULT_DIRECTION
    setDirection(DEFAULT_DIRECTION)
    scoreRef.current = 0
    setScore(0)
    setStatus('running')
    statusRef.current = 'running'
    startLoop()
  }, [startLoop, stopLoop])

  const handleStart = useCallback(() => {
    if (statusRef.current === 'running') return
    beginRound()
  }, [beginRound])

  const handleRestart = useCallback(() => {
    beginRound()
  }, [beginRound])

  const handleStop = useCallback(() => {
    if (statusRef.current !== 'running') return
    finishRound()
  }, [finishRound])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      let nextDirection: Direction | null = null
      if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') nextDirection = 'up'
      if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') nextDirection = 'down'
      if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') nextDirection = 'left'
      if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') nextDirection = 'right'
      if (!nextDirection) return
      if (statusRef.current !== 'running') return
      if (isOpposite(directionRef.current, nextDirection)) return
      event.preventDefault()
      directionRef.current = nextDirection
      setDirection(nextDirection)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    return () => {
      stopLoop()
    }
  }, [stopLoop])

  useEffect(() => {
    if (statusRef.current === 'running') {
      startLoop()
    }
  }, [startLoop])

  useEffect(() => {
    setHighScore(getPlayerHighScore(WORM_GAME_ID, playerName))
  }, [playerName])

  const snakeCells = useMemo(() => new Set(snake.map(coordKey)), [snake])
  const statusLabel = status === 'running' ? 'Running' : status === 'ended' ? 'Stopped' : 'Ready'

  const cells = useMemo(() => {
    return Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
      const x = index % GRID_SIZE
      const y = Math.floor(index / GRID_SIZE)
      const key = `cell-${x}-${y}`
      const head = snake[0]
      const isHead = head && head.x === x && head.y === y
      const isApple = apple.x === x && apple.y === y
      const occupied = snakeCells.has(coordKey({ x, y }))
      let className = 'worm-cell'
      if (isApple) {
        className += ' apple'
      } else if (isHead) {
        className += ' head'
      } else if (occupied) {
        className += ' snake'
      }
      return <div key={key} className={className} />
    })
  }, [apple, snake, snakeCells])

  return (
    <div className="panel worm-game">
      <header className="worm-header">
        <div>
          <p className="eyebrow">Arcade classic</p>
          <h1>Worm</h1>
          <p>Steer with arrow keys, eat apples, and avoid yourself. Each apple adds a point.</p>
        </div>
        <div className="worm-scoreboard">
          <span className="status-chip">Status: {statusLabel}</span>
          <span className="status-chip">Score: {score}</span>
          <span className="status-chip">High score: {highScore}</span>
          <span className="status-chip">Length: {snake.length}</span>
        </div>
      </header>
      <div className="worm-settings">
        <label className="stacked worm-difficulty">
          <span>Difficulty</span>
          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as keyof typeof DIFFICULTY_PRESETS)}
          >
            {Object.entries(DIFFICULTY_PRESETS).map(([key, preset]) => (
              <option key={key} value={key}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <p className="worm-speed-hint">Speed: {tickDuration}ms per step</p>
      </div>
      <div className="worm-grid" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
        {cells}
      </div>
      <div className="controls-row worm-controls">
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
      <p className="worm-hint">Tip: Arrow keys or WASD change direction instantly. Restart anytime to chase a higher score.</p>
    </div>
  )
}
