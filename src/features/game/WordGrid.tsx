import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { GRID_SIZE } from './constants'
import type { Cell } from './types'

const GRID_GAP = 8

interface WordGridProps {
  board: Cell[][]
  selectedPath: Cell[]
  enabled: boolean
  isCellEnabled: (cell: Cell) => boolean
  onCellAction: (cell: Cell) => void
}

interface DragContext {
  pointerId: number
  rect: DOMRect
  cellWidth: number
  cellHeight: number
  gap: number
  lastCellId: string | null
}

export function WordGrid({ board, selectedPath, enabled, isCellEnabled, onCellAction }: WordGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const dragContext = useRef<DragContext | null>(null)
  const selectedIds = useMemo(() => new Set(selectedPath.map((cell) => cell.id)), [selectedPath])
  const selectedTailId = selectedPath.at(-1)?.id ?? null

  useEffect(() => {
    if (!dragging) return

    const handleMove = (event: PointerEvent) => {
      const ctx = dragContext.current
      if (!ctx || event.pointerId !== ctx.pointerId) return
      const cell = locateCell(event.clientX, event.clientY, ctx, board)
      if (!cell || cell.id === ctx.lastCellId) return
      ctx.lastCellId = cell.id
      onCellAction(cell)
    }

    const stopDrag = (event: PointerEvent) => {
      const ctx = dragContext.current
      if (!ctx || event.pointerId !== ctx.pointerId) return
      dragContext.current = null
      setDragging(false)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', stopDrag)
    window.addEventListener('pointercancel', stopDrag)

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', stopDrag)
      window.removeEventListener('pointercancel', stopDrag)
    }
  }, [dragging, board, onCellAction])

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, cell: Cell) => {
    if (!enabled || event.button !== 0) return
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return
    const columns = board[0]?.length ?? GRID_SIZE
    const rows = board.length
    const cellWidth = (rect.width - GRID_GAP * (columns - 1)) / columns
    const cellHeight = (rect.height - GRID_GAP * (rows - 1)) / rows
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

  return (
    <div className="word-grid-wrapper" ref={gridRef}>
      <div className="word-grid" style={{ pointerEvents: enabled ? 'auto' : 'none' }}>
        {board.map((row) =>
          row.map((cell) => {
            const isSelected = selectedIds.has(cell.id)
            const isTail = cell.id === selectedTailId
            const cellEnabled = enabled && (isSelected ? isTail : isCellEnabled(cell))
            return (
              <button
                key={`${cell.id}`}
                type="button"
                className={`grid-cell${isSelected ? ' selected' : ''}${isTail ? ' current-tail' : ''}${!cellEnabled ? ' disabled' : ''}`}
                disabled={!cellEnabled}
                onPointerDown={(event) => handlePointerDown(event, cell)}
              >
                {cell.letter}
              </button>
            )
          }),
        )}
      </div>
    </div>
  )
}

function locateCell(clientX: number, clientY: number, ctx: DragContext, board: Cell[][]) {
  const columns = board[0]?.length ?? GRID_SIZE
  const rows = board.length
  const x = clientX - ctx.rect.left
  const y = clientY - ctx.rect.top
  if (x < -ctx.gap || y < -ctx.gap || x > ctx.rect.width + ctx.gap || y > ctx.rect.height + ctx.gap) {
    return null
  }

  const col = Math.min(
    columns - 1,
    Math.max(0, Math.floor((x + ctx.gap / 2) / (ctx.cellWidth + ctx.gap))),
  )
  const row = Math.min(rows - 1, Math.max(0, Math.floor((y + ctx.gap / 2) / (ctx.cellHeight + ctx.gap))))
  const cell = board[row]?.[col]
  return cell ?? null
}
