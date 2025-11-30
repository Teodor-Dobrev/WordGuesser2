import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { getPlayerHighScore, recordPlayerHighScore } from '../leaderboard/storage'

const PATHFINDER_GAME_ID = 'pathfinder'
const TIMER_TICK_MS = 100
const GRID_GAP = 6

const DIFFICULTIES = [
  { id: 'scout', label: 'Scout (15×15)', rows: 15, cols: 15 },
  { id: 'ranger', label: 'Ranger (21×21)', rows: 21, cols: 21 },
  { id: 'navigator', label: 'Navigator (27×27)', rows: 27, cols: 27 },
] as const

type DifficultyId = (typeof DIFFICULTIES)[number]['id']

type GameState = 'idle' | 'running' | 'won'

interface PathFinderGameProps {
  playerName: string
  onResetPlayer: () => void
  onSwitchProject?: () => void
}

interface MazeCell {
  row: number
  col: number
  id: string
  isWall: boolean
  isStart: boolean
  isEnd: boolean
}

interface GeneratedMaze {
  grid: MazeCell[][]
  start: MazeCell
  end: MazeCell
}

interface DragContext {
  pointerId: number
  rect: DOMRect
  cellWidth: number
  cellHeight: number
  gap: number
  lastCellId: string | null
}

export function PathFinderGame({ playerName, onResetPlayer, onSwitchProject }: PathFinderGameProps) {
  const [difficulty, setDifficulty] = useState<DifficultyId>('scout')
  const [maze, setMaze] = useState<GeneratedMaze>(() => generateMaze(DIFFICULTIES[0]))
  const [activePath, setActivePath] = useState<MazeCell[]>([])
  const [gameState, setGameState] = useState<GameState>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [bestTime, setBestTime] = useState(() => getPlayerHighScore(PATHFINDER_GAME_ID, playerName, difficulty))
  const timerRef = useRef<number | null>(null)
  const startedAtRef = useRef<number | null>(null)

  const activePathIds = useMemo(() => new Set(activePath.map((cell) => cell.id)), [activePath])
  const trailTailId = activePath.at(-1)?.id ?? null
  const diffMeta = DIFFICULTIES.find((item) => item.id === difficulty) ?? DIFFICULTIES[0]

  useEffect(() => {
    setBestTime(getPlayerHighScore(PATHFINDER_GAME_ID, playerName, difficulty))
  }, [difficulty, playerName])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }
    }
  }, [])

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const resetRun = (nextMaze?: GeneratedMaze) => {
    stopTimer()
    startedAtRef.current = null
    setElapsedMs(0)
    setActivePath([])
    setGameState('idle')
    if (nextMaze) {
      setMaze(nextMaze)
    }
  }

  const startRunIfNeeded = () => {
    if (gameState === 'won' || startedAtRef.current) return
    const now = Date.now()
    startedAtRef.current = now
    setElapsedMs(0)
    timerRef.current = window.setInterval(() => {
      if (!startedAtRef.current) return
      setElapsedMs(Date.now() - startedAtRef.current)
    }, TIMER_TICK_MS)
    setGameState('running')
  }

  const finishRun = () => {
    if (gameState === 'won' || !startedAtRef.current) return
    stopTimer()
    const finalTime = Date.now() - startedAtRef.current
    startedAtRef.current = null
    setElapsedMs(finalTime)
    setGameState('won')
    const updated = recordPlayerHighScore(PATHFINDER_GAME_ID, playerName, finalTime, {
      mode: 'min',
      scope: difficulty,
    })
    setBestTime(updated)
  }

  const handleCellAction = (cell: MazeCell) => {
    if (cell.isWall || gameState === 'won') return
    setActivePath((current) => {
      if (current.length === 0) {
        if (!cell.isStart) return current
        startRunIfNeeded()
        if (cell.isEnd) {
          finishRun()
        }
        return [cell]
      }
      const tail = current[current.length - 1]
      if (cell.id === tail.id) {
        return current
      }
      const prev = current[current.length - 2]
      if (prev && prev.id === cell.id) {
        return current.slice(0, -1)
      }
      if (!areNeighbors(tail, cell)) {
        return current
      }
      if (current.some((existing) => existing.id === cell.id)) {
        return current
      }
      const nextPath = [...current, cell]
      if (cell.isEnd) {
        finishRun()
      }
      return nextPath
    })
  }

  const isCellEnabled = (cell: MazeCell) => {
    if (cell.isWall || gameState === 'won') return false
    if (activePath.length === 0) {
      return cell.isStart
    }
    const tail = activePath[activePath.length - 1]
    if (cell.id === tail.id) return true
    const prev = activePath[activePath.length - 2]
    if (prev && prev.id === cell.id) return true
    if (activePath.some((existing) => existing.id === cell.id)) return false
    return areNeighbors(tail, cell)
  }

  const handleDifficultyChange = (nextId: DifficultyId) => {
    if (nextId === difficulty) return
    const meta = DIFFICULTIES.find((item) => item.id === nextId) ?? DIFFICULTIES[0]
    setDifficulty(meta.id)
    resetRun(generateMaze(meta))
  }

  const regenerateMaze = () => {
    resetRun(generateMaze(diffMeta))
  }

  const clearCurrentPath = () => {
    if (!activePath.length) return
    resetRun()
  }

  const statusLabel = gameState === 'won' ? 'Completed' : gameState === 'running' ? 'Exploring' : 'Idle'
  const timerLabel = formatMs(elapsedMs)
  const bestLabel = bestTime > 0 ? formatMs(bestTime) : '—'

  return (
    <div className="panel pathfinder-layout">
      <header className="pathfinder-header">
        <div>
          <p className="eyebrow">Path Finder</p>
          <h1>🧭 Trace the safe route</h1>
          <p>Drag from the green start to the blue exit without touching the walls. Bigger mazes unlock on higher difficulties.</p>
        </div>
        <div className="pathfinder-stats">
          <div className="status-chip">Player: {playerName}</div>
          <div className="status-chip">Status: {statusLabel}</div>
          <div className="status-chip">Timer: {timerLabel}</div>
          <div className="status-chip">Best ({diffMeta.label}): {bestLabel}</div>
        </div>
      </header>

      <div className="pathfinder-body">
        <section className="maze-panel">
          <MazeBoard
            grid={maze.grid}
            enabled={gameState !== 'won'}
            activePathIds={activePathIds}
            tailId={trailTailId}
            isCellEnabled={isCellEnabled}
            onCellAction={handleCellAction}
          />
          {gameState === 'won' && (
            <div className="pathfinder-toast success">Path complete! Your time: {timerLabel}</div>
          )}
        </section>
        <section className="pathfinder-controls">
          <div>
            <p className="eyebrow">Difficulty</p>
            <div className="difficulty-grid">
              {DIFFICULTIES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`action${option.id === difficulty ? ' primary' : ''}`}
                  onClick={() => handleDifficultyChange(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="button-grid">
            <button type="button" className="action success" onClick={regenerateMaze}>
              Regenerate maze
            </button>
            <button type="button" className="action" onClick={clearCurrentPath} disabled={!activePath.length}>
              Clear path
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
      </div>
    </div>
  )
}

interface MazeBoardProps {
  grid: MazeCell[][]
  enabled: boolean
  activePathIds: Set<string>
  tailId: string | null
  isCellEnabled: (cell: MazeCell) => boolean
  onCellAction: (cell: MazeCell) => void
}

function MazeBoard({ grid, enabled, activePathIds, tailId, isCellEnabled, onCellAction }: MazeBoardProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const dragContext = useRef<DragContext | null>(null)

  useEffect(() => {
    if (!dragging) return

    const handlePointerMove = (event: PointerEvent) => {
      const ctx = dragContext.current
      if (!ctx || event.pointerId !== ctx.pointerId) return
      const cell = locateCell(event.clientX, event.clientY, ctx, grid)
      if (!cell || cell.id === ctx.lastCellId) return
      ctx.lastCellId = cell.id
      onCellAction(cell)
    }

    const handlePointerEnd = (event: PointerEvent) => {
      const ctx = dragContext.current
      if (!ctx || event.pointerId !== ctx.pointerId) return
      dragContext.current = null
      setDragging(false)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerEnd)
    window.addEventListener('pointercancel', handlePointerEnd)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerEnd)
      window.removeEventListener('pointercancel', handlePointerEnd)
    }
  }, [dragging, grid, onCellAction])

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, cell: MazeCell) => {
    if (!enabled || event.button !== 0 || !isCellEnabled(cell)) return
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return
    const rows = grid.length
    const cols = grid[0]?.length ?? 0
    const cellWidth = cols ? (rect.width - GRID_GAP * (cols - 1)) / cols : 0
    const cellHeight = rows ? (rect.height - GRID_GAP * (rows - 1)) / rows : 0
    dragContext.current = {
      pointerId: event.pointerId,
      rect,
      cellWidth,
      cellHeight,
      gap: GRID_GAP,
      lastCellId: cell.id,
    }
    setDragging(true)
    event.preventDefault()
    onCellAction(cell)
  }

  const columns = grid[0]?.length ?? 0
  const gridStyle = {
    pointerEvents: enabled ? 'auto' : 'none',
    gridTemplateColumns: columns ? `repeat(${columns}, minmax(0, 1fr))` : undefined,
  } as const

  return (
    <div className="maze-grid-wrapper">
      <div className="maze-grid" ref={gridRef} style={gridStyle}>
        {grid.map((row) =>
          row.map((cell) => {
            const isActive = activePathIds.has(cell.id)
            const isTail = cell.id === tailId
            const enabledCell = enabled && isCellEnabled(cell)
            const classes = [
              'maze-cell',
              cell.isWall ? 'wall' : 'floor',
              cell.isStart ? 'start' : '',
              cell.isEnd ? 'end' : '',
              isActive ? 'active' : '',
              isTail ? 'tail' : '',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <button
                key={cell.id}
                type="button"
                className={classes}
                disabled={!enabledCell}
                onPointerDown={(event) => handlePointerDown(event, cell)}
                aria-label={`Cell ${cell.row + 1},${cell.col + 1}`}
              >
                {cell.isStart ? 'S' : cell.isEnd ? 'E' : ''}
              </button>
            )
          }),
        )}
      </div>
    </div>
  )
}

function locateCell(clientX: number, clientY: number, ctx: DragContext, grid: MazeCell[][]) {
  const cols = grid[0]?.length ?? 0
  const rows = grid.length
  if (!cols || !rows) return null
  const x = clientX - ctx.rect.left
  const y = clientY - ctx.rect.top
  if (x < -ctx.gap || y < -ctx.gap || x > ctx.rect.width + ctx.gap || y > ctx.rect.height + ctx.gap) {
    return null
  }
  const col = Math.min(cols - 1, Math.max(0, Math.floor((x + ctx.gap / 2) / (ctx.cellWidth + ctx.gap))))
  const row = Math.min(rows - 1, Math.max(0, Math.floor((y + ctx.gap / 2) / (ctx.cellHeight + ctx.gap))))
  return grid[row]?.[col] ?? null
}

function areNeighbors(a: MazeCell, b: MazeCell) {
  const distance = Math.abs(a.row - b.row) + Math.abs(a.col - b.col)
  return distance === 1
}

function formatMs(value: number) {
  if (value <= 0) return '0.0s'
  const seconds = value / 1000
  return `${seconds.toFixed(1)}s`
}

function generateMaze(meta: (typeof DIFFICULTIES)[number]): GeneratedMaze {
  const rows = ensureOdd(meta.rows)
  const cols = ensureOdd(meta.cols)
  const layout = Array.from({ length: rows }, () => Array(cols).fill(true))
  const startRow = clampToInteriorOdd(Math.floor(rows / 2), rows)
  const startCol = 1
  carveMazeLayout(layout, startRow, startCol)
  addLoopBreaks(layout, Math.floor(rows * cols * 0.045))
  addLoopBreaks(layout, Math.floor(rows * 0.6))
  layout[startRow][0] = false
  layout[startRow][1] = false

  const distances = computeDistances(layout, startRow, 0)
  const exitRow = pickExitRow(layout, distances)
  layout[exitRow][cols - 2] = false
  layout[exitRow][cols - 1] = false
  reinforceDeadEnds(layout, startRow, exitRow, Math.floor(rows * cols * 0.02))
  const refreshedDistances = computeDistances(layout, startRow, 0)
  const primaryPath = buildPrimaryPathSet(refreshedDistances, exitRow, cols - 1)
  pruneAlternateRoutes(layout, primaryPath, startRow, exitRow, Math.floor(rows * cols * 0.015))

  const grid: MazeCell[][] = layout.map((rowData, row) =>
    rowData.map((isWall, col) => ({
      row,
      col,
      id: `${row}-${col}`,
      isWall,
      isStart: row === startRow && col === 0,
      isEnd: row === exitRow && col === cols - 1,
    })),
  )

  return {
    grid,
    start: grid[startRow][0],
    end: grid[exitRow][cols - 1],
  }
}

const CARVE_STEPS = [
  { dr: -2, dc: 0 },
  { dr: 2, dc: 0 },
  { dr: 0, dc: -2 },
  { dr: 0, dc: 2 },
] as const

const ADJACENT_STEPS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
] as const

function ensureOdd(value: number) {
  return value % 2 === 0 ? value + 1 : value
}

function clampToInteriorOdd(seed: number, upperBound: number) {
  const odd = seed % 2 === 0 ? seed + 1 : seed
  return Math.max(1, Math.min(upperBound - 2, odd))
}

function carveMazeLayout(layout: boolean[][], startRow: number, startCol: number) {
  const rows = layout.length
  const cols = layout[0]?.length ?? 0
  const stack: Array<{ row: number; col: number }> = [{ row: startRow, col: startCol }]
  layout[startRow][startCol] = false

  while (stack.length) {
    const current = stack[stack.length - 1]
    const candidates = shuffled(CARVE_STEPS)
      .map((step) => {
        const nextRow = current.row + step.dr
        const nextCol = current.col + step.dc
        if (nextRow <= 0 || nextRow >= rows - 1 || nextCol <= 0 || nextCol >= cols - 1) {
          return null
        }
        if (!layout[nextRow][nextCol]) {
          return null
        }
        return {
          nextRow,
          nextCol,
          betweenRow: current.row + step.dr / 2,
          betweenCol: current.col + step.dc / 2,
        }
      })
      .filter(Boolean) as Array<{ nextRow: number; nextCol: number; betweenRow: number; betweenCol: number }>

    if (!candidates.length) {
      stack.pop()
      continue
    }

    const choice = candidates[0]
    layout[choice.betweenRow][choice.betweenCol] = false
    layout[choice.nextRow][choice.nextCol] = false
    stack.push({ row: choice.nextRow, col: choice.nextCol })
  }
}

function shuffled<T>(items: readonly T[]) {
  const clone = [...items]
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[clone[i], clone[j]] = [clone[j], clone[i]]
  }
  return clone
}

function addLoopBreaks(layout: boolean[][], attempts: number) {
  const rows = layout.length
  const cols = layout[0]?.length ?? 0
  for (let i = 0; i < attempts; i += 1) {
    const row = Math.floor(Math.random() * (rows - 2)) + 1
    const col = Math.floor(Math.random() * (cols - 2)) + 1
    if (!layout[row][col]) continue
    let openNeighbors = 0
    for (const step of ADJACENT_STEPS) {
      const nr = row + step.dr
      const nc = col + step.dc
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (!layout[nr][nc]) {
        openNeighbors += 1
      }
    }
    if (openNeighbors >= 2) {
      layout[row][col] = false
    }
  }
}

function computeDistances(layout: boolean[][], startRow: number, startCol: number) {
  const rows = layout.length
  const cols = layout[0]?.length ?? 0
  const distances = Array.from({ length: rows }, () => Array(cols).fill(-1))
  const queue: Array<{ row: number; col: number }> = [{ row: startRow, col: startCol }]
  distances[startRow][startCol] = 0

  while (queue.length) {
    const current = queue.shift()!
    const nextDistance = distances[current.row][current.col] + 1
    for (const step of ADJACENT_STEPS) {
      const row = current.row + step.dr
      const col = current.col + step.dc
      if (row < 0 || row >= rows || col < 0 || col >= cols) continue
      if (layout[row][col]) continue
      if (distances[row][col] !== -1) continue
      distances[row][col] = nextDistance
      queue.push({ row, col })
    }
  }

  return distances
}

function pickExitRow(layout: boolean[][], distances: number[][]) {
  const rows = layout.length
  const cols = layout[0]?.length ?? 0
  const targetCol = cols - 2
  let candidateRow = 1
  let bestDistance = -1

  for (let row = 1; row < rows - 1; row += 1) {
    if (layout[row][targetCol]) continue
    const distance = distances[row][targetCol]
    if (distance > bestDistance) {
      bestDistance = distance
      candidateRow = row
    }
  }

  if (bestDistance !== -1) {
    return candidateRow
  }

  for (let row = 1; row < rows - 1; row += 1) {
    for (let col = 1; col < cols - 1; col += 1) {
      if (layout[row][col]) continue
      const distance = distances[row][col]
      if (distance > bestDistance) {
        bestDistance = distance
        candidateRow = row
      }
    }
  }

  return candidateRow
}

function reinforceDeadEnds(layout: boolean[][], startRow: number, exitRow: number, attempts: number) {
  const rows = layout.length
  const cols = layout[0]?.length ?? 0
  for (let i = 0; i < attempts; i += 1) {
    const row = Math.floor(Math.random() * (rows - 2)) + 1
    const col = Math.floor(Math.random() * (cols - 2)) + 1
    if (layout[row][col]) continue
    if ((row === startRow && col <= 1) || (row === exitRow && col >= cols - 2)) continue
    let openNeighbors = 0
    for (const step of ADJACENT_STEPS) {
      const nr = row + step.dr
      const nc = col + step.dc
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (!layout[nr][nc]) openNeighbors += 1
    }
    if (openNeighbors < 3) continue
    layout[row][col] = true
    if (!isReachable(layout, startRow, exitRow)) {
      layout[row][col] = false
    }
  }
}

function isReachable(layout: boolean[][], startRow: number, exitRow: number) {
  const rows = layout.length
  const cols = layout[0]?.length ?? 0
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false))
  const queue: Array<{ row: number; col: number }> = [{ row: startRow, col: 0 }]
  visited[startRow][0] = true
  const targetRow = exitRow
  const targetCol = cols - 1

  while (queue.length) {
    const current = queue.shift()!
    if (current.row === targetRow && current.col === targetCol) {
      return true
    }
    for (const step of ADJACENT_STEPS) {
      const row = current.row + step.dr
      const col = current.col + step.dc
      if (row < 0 || row >= rows || col < 0 || col >= cols) continue
      if (visited[row][col]) continue
      if (layout[row][col]) continue
      visited[row][col] = true
      queue.push({ row, col })
    }
  }

  return false
}

function buildPrimaryPathSet(distances: number[][], exitRow: number, exitCol: number) {
  const rows = distances.length
  const cols = distances[0]?.length ?? 0
  if (!rows || !cols) return new Set<string>()
  if (exitRow < 0 || exitRow >= rows || exitCol < 0 || exitCol >= cols) {
    return new Set<string>()
  }
  const path = new Set<string>()
  if (distances[exitRow][exitCol] === -1) {
    return path
  }
  let currentRow = exitRow
  let currentCol = exitCol
  path.add(`${currentRow}-${currentCol}`)
  let currentDistance = distances[currentRow][currentCol]

  while (currentDistance > 0) {
    let moved = false
    for (const step of ADJACENT_STEPS) {
      const row = currentRow + step.dr
      const col = currentCol + step.dc
      if (row < 0 || row >= rows || col < 0 || col >= cols) continue
      if (distances[row][col] === currentDistance - 1) {
        currentRow = row
        currentCol = col
        currentDistance = distances[row][col]
        path.add(`${currentRow}-${currentCol}`)
        moved = true
        break
      }
    }
    if (!moved) {
      break
    }
  }

  return path
}

const PATCH_TEMPLATES: Array<Array<{ dr: number; dc: number }>> = [
  [{ dr: 0, dc: 0 }],
  [{ dr: 0, dc: 0 }, { dr: 1, dc: 0 }],
  [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }],
  [{ dr: 0, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: 1 }, { dr: 1, dc: 1 }],
  [{ dr: 0, dc: 0 }, { dr: 1, dc: 0 }, { dr: 2, dc: 0 }],
  [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }, { dr: 0, dc: 2 }],
  [
    { dr: 0, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: 1 },
    { dr: -1, dc: 0 },
    { dr: 0, dc: -1 },
  ],
]

function pruneAlternateRoutes(
  layout: boolean[][],
  primaryPath: Set<string>,
  startRow: number,
  exitRow: number,
  attempts: number,
) {
  const rows = layout.length
  const cols = layout[0]?.length ?? 0
  for (let i = 0; i < attempts; i += 1) {
    const template = PATCH_TEMPLATES[Math.floor(Math.random() * PATCH_TEMPLATES.length)]
    const baseRow = Math.floor(Math.random() * (rows - 2)) + 1
    const baseCol = Math.floor(Math.random() * (cols - 2)) + 1
    const patchCells: Array<{ row: number; col: number }> = []
    let isValidPatch = true
    for (const offset of template) {
      const row = baseRow + offset.dr
      const col = baseCol + offset.dc
      if (row <= 0 || row >= rows - 1 || col <= 0 || col >= cols - 1) {
        isValidPatch = false
        break
      }
      const key = `${row}-${col}`
      if (primaryPath.has(key)) {
        isValidPatch = false
        break
      }
      if (row === startRow && col <= 1) {
        isValidPatch = false
        break
      }
      if (row === exitRow && col >= cols - 2) {
        isValidPatch = false
        break
      }
      if (layout[row][col]) {
        isValidPatch = false
        break
      }
      patchCells.push({ row, col })
    }
    if (!isValidPatch || patchCells.length === 0) {
      continue
    }
    patchCells.forEach((cell) => {
      layout[cell.row][cell.col] = true
    })
    if (!isReachable(layout, startRow, exitRow)) {
      patchCells.forEach((cell) => {
        layout[cell.row][cell.col] = false
      })
    }
  }
}
