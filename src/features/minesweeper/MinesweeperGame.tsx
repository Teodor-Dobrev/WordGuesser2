import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { getPlayerHighScore, recordPlayerHighScore } from '../leaderboard/storage'

const MINESWEEPER_GAME_ID = 'minesweeperclassic'

type GameStatus = 'idle' | 'running' | 'won' | 'lost'

type DifficultyKey = 'beginner' | 'intermediate' | 'expert'

interface DifficultyConfig {
  label: string
  width: number
  height: number
  mines: number
}

const DIFFICULTY_PRESETS: Record<DifficultyKey, DifficultyConfig> = {
  beginner: { label: 'Beginner', width: 9, height: 9, mines: 10 },
  intermediate: { label: 'Intermediate', width: 16, height: 16, mines: 40 },
  expert: { label: 'Expert', width: 30, height: 16, mines: 99 },
}

interface Cell {
  id: string
  x: number
  y: number
  hasMine: boolean
  adjacent: number
  revealed: boolean
  flagged: boolean
}

interface MinesweeperGameProps {
  playerName: string
  onResetPlayer: () => void
  onSwitchProject?: () => void
}

export function MinesweeperGame({ playerName, onResetPlayer, onSwitchProject }: MinesweeperGameProps) {
  const [difficulty, setDifficulty] = useState<DifficultyKey>('beginner')
  const config = DIFFICULTY_PRESETS[difficulty]
  const [board, setBoard] = useState<Cell[]>(() => buildBoard(config))
  const [status, setStatus] = useState<GameStatus>('idle')
  const [firstMoveMade, setFirstMoveMade] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [bestTimeMs, setBestTimeMs] = useState(() => getPlayerHighScore(MINESWEEPER_GAME_ID, playerName, difficulty) || 0)

  const timerRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  const totalSafeCells = config.width * config.height - config.mines

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const evaluateWinCondition = useCallback(
    (candidateBoard: Cell[]) => {
      const revealedSafe = candidateBoard.filter((c) => c.revealed && !c.hasMine).length
      if (revealedSafe >= totalSafeCells) {
        stopTimer()
        setStatus('won')
        const finalTime = startTimeRef.current ? Date.now() - startTimeRef.current : elapsedMs
        const updated = recordPlayerHighScore(MINESWEEPER_GAME_ID, playerName, finalTime, {
          scope: difficulty,
          mode: 'min',
        })
        setBestTimeMs(updated)
        return true
      }
      return false
    },
    [difficulty, elapsedMs, playerName, stopTimer, totalSafeCells],
  )

  const cascadeReveal = useCallback(
    (boardDraft: Cell[], startIndex: number) => {
      const queue: number[] = [startIndex]
      let hitMine = false
      while (queue.length > 0) {
        const currentIndex = queue.shift()!
        const currentCell = boardDraft[currentIndex]
        if (!currentCell || currentCell.revealed || currentCell.flagged) continue
        if (currentCell.hasMine) {
          boardDraft[currentIndex] = { ...currentCell, revealed: true }
          hitMine = true
          continue
        }
        boardDraft[currentIndex] = { ...currentCell, revealed: true }
        if (currentCell.adjacent === 0) {
          const neighbors = getNeighborIndices(currentCell, config)
          neighbors.forEach((neighborIndex) => {
            const neighbor = boardDraft[neighborIndex]
            if (neighbor && !neighbor.revealed && !neighbor.flagged) {
              queue.push(neighborIndex)
            }
          })
        }
      }
      return hitMine
    },
    [config],
  )

  const generateOpeningBoard = useCallback(
    (target: Cell) => {
      const protectedCells = [target, ...getNeighborCoords(target, config)]
      const targetIndex = target.y * config.width + target.x
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const candidate = buildBoard(config, protectedCells)
        const candidateCell = candidate[targetIndex]
        if (candidateCell && !candidateCell.hasMine && candidateCell.adjacent === 0) {
          return candidate
        }
      }
      return buildBoard(config, protectedCells)
    },
    [config],
  )

  useEffect(() => {
    setBoard(buildBoard(config))
    setStatus('idle')
    setFirstMoveMade(false)
    setElapsedMs(0)
    stopTimer()
    startTimeRef.current = null
    setBestTimeMs(getPlayerHighScore(MINESWEEPER_GAME_ID, playerName, difficulty) || 0)
  }, [config, difficulty, playerName, stopTimer])

  useEffect(() => {
    return () => stopTimer()
  }, [stopTimer])

  const startTimer = useCallback(() => {
    stopTimer()
    startTimeRef.current = Date.now()
    setElapsedMs(0)
    timerRef.current = window.setInterval(() => {
      if (!startTimeRef.current) return
      setElapsedMs(Date.now() - startTimeRef.current)
    }, 200)
  }, [stopTimer])

  const revealCell = useCallback(
    (index: number) => {
      setBoard((prevBoard) => {
        const cell = prevBoard[index]
        if (!cell || cell.flagged || status === 'won' || status === 'lost') {
          return prevBoard
        }
        if (cell.revealed) {
          return prevBoard
        }

        let workingBoard = prevBoard
        if (!firstMoveMade) {
          setFirstMoveMade(true)
          workingBoard = generateOpeningBoard(cell)
          setStatus('running')
          startTimer()
        }

        const nextBoard = workingBoard.map((entry) => ({ ...entry }))
        const hitMine = cascadeReveal(nextBoard, index)
        if (hitMine) {
          stopTimer()
          revealRemainingMines(nextBoard)
          setStatus('lost')
          return nextBoard
        }
        evaluateWinCondition(nextBoard)
        return nextBoard
      })
    },
    [cascadeReveal, config, evaluateWinCondition, firstMoveMade, generateOpeningBoard, startTimer, status, stopTimer],
  )

  const chordCell = useCallback(
    (index: number) => {
      setBoard((prevBoard) => {
        const cell = prevBoard[index]
        if (!cell || !cell.revealed || cell.hasMine || cell.adjacent === 0 || status !== 'running') {
          return prevBoard
        }
        const neighbors = getNeighborIndices(cell, config)
        const flaggedNeighbors = neighbors.filter((neighborIndex) => prevBoard[neighborIndex]?.flagged).length
        if (flaggedNeighbors !== cell.adjacent) {
          return prevBoard
        }

        const nextBoard = prevBoard.map((entry) => ({ ...entry }))
        let triggeredMine = false
        neighbors.forEach((neighborIndex) => {
          const neighbor = nextBoard[neighborIndex]
          if (!neighbor || neighbor.flagged || neighbor.revealed) return
          if (cascadeReveal(nextBoard, neighborIndex)) {
            triggeredMine = true
          }
        })

        if (triggeredMine) {
          stopTimer()
          revealRemainingMines(nextBoard)
          setStatus('lost')
          return nextBoard
        }

        evaluateWinCondition(nextBoard)
        return nextBoard
      })
    },
    [cascadeReveal, config, evaluateWinCondition, status, stopTimer],
  )

  const toggleFlag = useCallback(
    (event: MouseEvent, index: number) => {
      event.preventDefault()
      setBoard((prevBoard) => {
        const target = prevBoard[index]
        if (!target || target.revealed || status === 'lost' || status === 'won') {
          return prevBoard
        }
        const nextBoard = [...prevBoard]
        nextBoard[index] = { ...target, flagged: !target.flagged }
        return nextBoard
      })
    },
    [status],
  )

  const handleRestart = useCallback(() => {
    stopTimer()
    setBoard(buildBoard(config))
    setStatus('idle')
    setFirstMoveMade(false)
    setElapsedMs(0)
    startTimeRef.current = null
  }, [config, stopTimer])

  const flaggedCount = useMemo(() => board.filter((cell) => cell.flagged).length, [board])
  const boardRows = useMemo(() => chunk(board, config.width), [board, config.width])
  const timerLabel = formatElapsed(elapsedMs)
  const bestLabel = bestTimeMs > 0 ? formatElapsed(bestTimeMs) : '—'
  const minesLeft = Math.max(0, config.mines - flaggedCount)

  return (
    <div className="panel minesweeper-panel">
      <header className="minesweeper-hero">
        <div>
          <p className="eyebrow">Minesweeper Classic</p>
          <h1>💣 Sweep the field before the timer wins.</h1>
          <p>Left-click to reveal, right-click to flag. Clear the board faster than your last best time.</p>
        </div>
        <div className="minesweeper-meta">
          <span className="status-chip">Player: {playerName}</span>
          <span className="status-chip">Status: {labelStatus(status)}</span>
        </div>
      </header>

      <section className="minesweeper-hud">
        <div className="hud-card">
          <span>Mines left</span>
          <strong>{minesLeft}</strong>
        </div>
        <div className="hud-card">
          <span>Flags</span>
          <strong>{flaggedCount}</strong>
        </div>
        <div className="hud-card">
          <span>Timer</span>
          <strong>{timerLabel}</strong>
        </div>
        <div className="hud-card">
          <span>Best ({config.label})</span>
          <strong>{bestLabel}</strong>
        </div>
        <div className="hud-card">
          <span>Revealed</span>
          <strong>{board.filter((cell) => cell.revealed).length}</strong>
        </div>
      </section>

      <section className="minesweeper-controls">
        <label className="stacked">
          <span>Difficulty</span>
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as DifficultyKey)} disabled={status === 'running'}>
            {Object.entries(DIFFICULTY_PRESETS).map(([key, preset]) => (
              <option key={key} value={key}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <div className="button-group">
          <button type="button" className="action success" onClick={handleRestart}>
            {status === 'running' ? 'Restart' : 'Start'}
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
      </section>

      {status === 'won' && (
        <p className="minesweeper-toast success">✅ Field cleared in {timerLabel}. Try to beat that time!</p>
      )}
      {status === 'lost' && (
        <p className="minesweeper-toast danger">💥 Boom! That tile hid a mine. Restart to sweep again.</p>
      )}

      <div className="minesweeper-board" onContextMenu={(event) => event.preventDefault()}>
        <section
          className="minesweeper-grid"
          style={{ gridTemplateColumns: `repeat(${config.width}, 32px)` }}
        >
          {boardRows.map((row, rowIndex) =>
            row.map((cell, cellIndex) => {
              const absoluteIndex = rowIndex * config.width + cellIndex
              const classNames = ['minesweeper-cell']
              if (cell.revealed) classNames.push('revealed')
              if (cell.flagged) classNames.push('flagged')
              if (cell.revealed && cell.hasMine) classNames.push('mine')
              if (cell.revealed && cell.adjacent > 0) classNames.push(`n${cell.adjacent}`)

              const handleClick = () => {
                if (cell.revealed && !cell.hasMine && cell.adjacent > 0) {
                  chordCell(absoluteIndex)
                } else {
                  revealCell(absoluteIndex)
                }
              }

              return (
                <button
                  key={cell.id}
                  type="button"
                  className={classNames.join(' ')}
                  onClick={handleClick}
                  onContextMenu={(event) => toggleFlag(event, absoluteIndex)}
                  aria-label={`Cell ${cell.x + 1},${cell.y + 1}`}
                >
                  {renderCellContent(cell)}
                </button>
              )
            }),
          )}
        </section>
      </div>
    </div>
  )
}

function buildBoard(config: DifficultyConfig, safeCells: Array<{ x: number; y: number }> = []): Cell[] {
  const cells: Cell[] = []
  for (let y = 0; y < config.height; y++) {
    for (let x = 0; x < config.width; x++) {
      cells.push({
        id: `${x}-${y}`,
        x,
        y,
        hasMine: false,
        adjacent: 0,
        revealed: false,
        flagged: false,
      })
    }
  }

  const protectedIds = new Set(safeCells.map(({ x, y }) => `${x}-${y}`))
  const availableIndices = cells.map((_, index) => index).filter((index) => !protectedIds.has(cells[index].id))

  shuffle(availableIndices)
  const mineIndices = availableIndices.slice(0, config.mines)
  mineIndices.forEach((index) => {
    cells[index].hasMine = true
  })

  cells.forEach((cell) => {
    if (cell.hasMine) {
      cell.adjacent = 0
      return
    }
    const neighbors = getNeighborIndices(cell, config)
    cell.adjacent = neighbors.reduce((count, neighborIndex) => (cells[neighborIndex]?.hasMine ? count + 1 : count), 0)
  })

  return cells
}

function getNeighborCoords(cell: { x: number; y: number }, config: DifficultyConfig) {
  const coords: Array<{ x: number; y: number }> = []
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const nx = cell.x + dx
      const ny = cell.y + dy
      if (nx < 0 || ny < 0 || nx >= config.width || ny >= config.height) continue
      coords.push({ x: nx, y: ny })
    }
  }
  return coords
}

function getNeighborIndices(cell: Cell, config: DifficultyConfig) {
  const neighbors: number[] = []
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const nx = cell.x + dx
      const ny = cell.y + dy
      if (nx < 0 || ny < 0 || nx >= config.width || ny >= config.height) continue
      neighbors.push(ny * config.width + nx)
    }
  }
  return neighbors
}

function revealRemainingMines(board: Cell[]) {
  board.forEach((cell) => {
    if (cell.hasMine) {
      cell.revealed = true
      cell.flagged = false
    }
  })
}

function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

function chunk<T>(array: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size))
  }
  return result
}

function formatElapsed(ms: number) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function labelStatus(status: GameStatus) {
  switch (status) {
    case 'running':
      return 'Running'
    case 'won':
      return 'Cleared'
    case 'lost':
      return 'Boom'
    default:
      return 'Ready'
  }
}

function renderCellContent(cell: Cell) {
  if (cell.flagged && !cell.revealed) {
    return <FlagIcon />
  }
  if (!cell.revealed) {
    return null
  }
  if (cell.hasMine) {
    return <MineIcon />
  }
  if (cell.adjacent > 0) {
    return <span>{cell.adjacent}</span>
  }
  return null
}

function MineIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <circle cx="12" cy="12" r="6" fill="#0f172a" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path d="M6 3v18" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 4h9l-3 4 3 4H8z" fill="#dc2626" stroke="#dc2626" />
    </svg>
  )
}
