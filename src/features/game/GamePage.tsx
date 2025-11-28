import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_TIMER_SECONDS,
  formatDuration,
  getWeights,
  GRID_SIZE,
  TIMER_OPTIONS_SECONDS,
} from './constants'
import type { Cell, GameLanguage, GameStatus, GuessedWord } from './types'
import { WordGrid } from './WordGrid'
import { GuessedWordsPanel } from './GuessedWordsPanel'
import { pointsForLength } from './points'
import { loadDictionary } from '../../services/dictionaryLoader'
import { getDefinition } from '../../services/definitionsCache'
import { EndOfGameModal } from '../stats/EndOfGameModal'
import { LeaderboardModal } from '../leaderboard/LeaderboardModal'
import {
  getLeaderboard,
  recordLeaderboardEntry,
  getPlayerHighScore,
  recordPlayerHighScore,
} from '../leaderboard/storage'

interface GamePageProps {
  playerName: string
  onResetPlayer: () => void
  onSwitchProject?: () => void
}

export function GamePage({ playerName, onResetPlayer, onSwitchProject }: GamePageProps) {
  const [language, setLanguage] = useState<GameLanguage>('english')
  const [board, setBoard] = useState(() => generateBoard('english'))
  const [dictionary, setDictionary] = useState<Set<string>>(new Set())
  const [dictionaryLoading, setDictionaryLoading] = useState(true)
  const [dictionaryCount, setDictionaryCount] = useState(0)
  const [status, setStatus] = useState<GameStatus>('idle')
  const statusRef = useRef<GameStatus>('idle')
  const [timerSeconds, setTimerSeconds] = useState(DEFAULT_TIMER_SECONDS)
  const [remainingMs, setRemainingMs] = useState(DEFAULT_TIMER_SECONDS * 1000)
  const timerIdRef = useRef<number | null>(null)
  const selection = useSelectionManager(board)
  const { selectedPath, currentWord, select, typeLetter, backspace, clear } = selection
  const [guessedWords, setGuessedWords] = useState<GuessedWord[]>([])
  const [playerHighScore, setPlayerHighScore] = useState(() => getPlayerHighScore(playerName))
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [leaderboardEntries, setLeaderboardEntries] = useState(() => getLeaderboard(DEFAULT_TIMER_SECONDS))
  const [leaderboardTimer, setLeaderboardTimer] = useState(DEFAULT_TIMER_SECONDS)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [highlightEntryId, setHighlightEntryId] = useState<string | undefined>(undefined)
  const gameActive = status === 'running'
  const languageLabel = language === 'english' ? 'English' : 'Български'
  const wordsFound = guessedWords.length
  const roundPoints = useMemo(() => guessedWords.reduce((sum, entry) => sum + entry.points, 0), [guessedWords])

  useEffect(() => {
    let cancelled = false
    setDictionaryLoading(true)
    setDictionaryCount(0)
    loadDictionary(language).then((setResult) => {
      if (!cancelled) {
        setDictionary(setResult)
        setDictionaryCount(setResult.size)
        setDictionaryLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [language])

  useEffect(() => {
    setBoard(generateBoard(language))
    clear()
  }, [language, clear])

  useEffect(() => {
    if (status === 'idle') {
      setRemainingMs(timerSeconds * 1000)
    }
  }, [timerSeconds, status])

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    return () => {
      if (timerIdRef.current) {
        window.clearInterval(timerIdRef.current)
      }
    }
  }, [])

  const handleGuess = useCallback(() => {
    if (!gameActive) return
    if (!currentWord || currentWord.length < 2) return
    const normalized = normalizeWord(currentWord)
    if (!dictionary.has(normalized)) return

    const wordPoints = pointsForLength(normalized.length)
    const timestamp = Date.now()
    let accepted = false
    let duplicate = false

    setGuessedWords((prev) => {
      if (prev.some((entry) => entry.word === normalized)) {
        duplicate = true
        return prev
      }
      const nextEntry: GuessedWord = {
        word: normalized,
        points: wordPoints,
        definition: null,
        timestamp,
      }
      accepted = true
      const updated = [...prev, nextEntry]
      updated.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        if (b.word.length !== a.word.length) return b.word.length - a.word.length
        return a.word.localeCompare(b.word)
      })
      return updated
    })

    clear()

    if (!accepted && !duplicate) {
      return
    }

    // Request a definition for the guessed word for supported languages
    if (language === 'english' || language === 'bulgarian') {
      getDefinition(normalized, language).then((definition) => {
        if (!definition) return
        setGuessedWords((prev) => {
          const existing = prev.find((entry) => entry.word === normalized)
          if (!existing) {
            return prev.map((entry) => (entry.timestamp === timestamp ? { ...entry, definition } : entry))
          }
          return prev.map((entry) => (entry.word === normalized ? { ...entry, definition } : entry))
        })
      })
    }
  }, [clear, dictionary, gameActive, language, currentWord])

  const stopTimer = useCallback(() => {
    if (timerIdRef.current) {
      window.clearInterval(timerIdRef.current)
      timerIdRef.current = null
    }
  }, [])

  const stopGameRef = useRef<(reason: 'timeout' | 'forfeit') => void>(() => {})

  const stopGame = useCallback(
    (reason: 'timeout' | 'forfeit') => {
      void reason
      if (statusRef.current !== 'running') return
      stopTimer()
      setStatus('ended')
      setRemainingMs(0)
      setShowStatsModal(true)
      const entryId = safeId()
      // Compute the round's total from the guessed words to avoid races
      const leaderboardEntry = {
        id: entryId,
        player: playerName,
        points: roundPoints,
        words: wordsFound,
        timerSeconds,
        finishedAt: new Date().toISOString(),
      }
      const updated = recordLeaderboardEntry(leaderboardEntry)
      setLeaderboardEntries(updated)
      const updatedHighScore = recordPlayerHighScore(playerName, roundPoints)
      setPlayerHighScore(updatedHighScore)
      setHighlightEntryId(entryId)
      clear()
      setLeaderboardTimer(timerSeconds)
    },
    [clear, wordsFound, playerName, roundPoints, stopTimer, timerSeconds],
  )

  useEffect(() => {
    stopGameRef.current = stopGame
  }, [stopGame])

    useEffect(() => {
      setPlayerHighScore(getPlayerHighScore(playerName))
    }, [playerName])

  const startGame = useCallback(() => {
    if (dictionaryLoading) return
    stopTimer()
    setBoard(generateBoard(language))
    clear()
    setGuessedWords([])
    setStatus('running')
    const totalMs = timerSeconds * 1000
    setRemainingMs(totalMs)
    const endAt = Date.now() + totalMs
    timerIdRef.current = window.setInterval(() => {
      const remaining = Math.max(0, endAt - Date.now())
      setRemainingMs(remaining)
      if (remaining <= 0) {
        stopGameRef.current('timeout')
      }
    }, 200)
  }, [clear, dictionaryLoading, language, stopTimer, timerSeconds])

  const handleStopClick = () => {
    if (!gameActive) return
    const confirm = window.confirm('Stop the current round? Your progress will be recorded.')
    if (confirm) {
      stopGame('forfeit')
    }
  }

  const handleRestart = () => {
    if (!gameActive) return
    const confirm = window.confirm('Restart the round? Current progress will be lost.')
    if (confirm) {
      startGame()
    }
  }

  useEffect(() => {
    if (!gameActive) return
    const handleKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return
      }
      const normalizedLetter = normalizeKey(language, event.key)
      if (event.repeat && normalizedLetter) {
        event.preventDefault()
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        handleGuess()
        return
      }
      if (event.key === 'Backspace') {
        event.preventDefault()
        backspace()
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        clear()
        return
      }
      if (normalizedLetter) {
        event.preventDefault()
        typeLetter(normalizedLetter)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [backspace, clear, gameActive, handleGuess, language, typeLetter])

  const handleCellAction = useCallback(
    (cell: Cell) => {
      if (!gameActive) return
      select(cell)
    },
    [gameActive, select],
  )

  const isCellEnabled = useCallback(
    (cell: Cell) => {
      if (!gameActive) return false
      if (selectedPath.length === 0) return true
      const last = selectedPath[selectedPath.length - 1]
      if (cell.id === last.id) return true
      if (selectedPath.some((existing) => existing.id === cell.id)) {
        return false
      }
      return areNeighbors(last, cell)
    },
    [gameActive, selectedPath],
  )

  const handleStatsClose = () => {
    setShowStatsModal(false)
  }

  const timerDisplay = useMemo(() => formatDuration(Math.ceil(remainingMs / 1000)), [remainingMs])

  const canGuess = gameActive && currentWord.length > 1

  const openLeaderboard = useCallback(
    (seconds = timerSeconds) => {
      setLeaderboardEntries(getLeaderboard(seconds))
      setLeaderboardTimer(seconds)
      setHighlightEntryId(undefined)
      setShowLeaderboard(true)
    },
    [timerSeconds],
  )

  useEffect(() => {
    if (language !== 'english' && language !== 'bulgarian') return
    if (!guessedWords.length) return
    const missing = guessedWords.filter((entry) => !entry.definition)
    if (missing.length === 0) return
    let cancelled = false
    missing.forEach((entry) => {
      getDefinition(entry.word, language).then((definition) => {
        if (cancelled || !definition) return
        setGuessedWords((prev) =>
          prev.map((word) => (word.word === entry.word && !word.definition ? { ...word, definition } : word)),
        )
      })
    })
    return () => {
      cancelled = true
    }
  }, [guessedWords, language])

  return (
    <div className="panel game-layout">
      <div className="game-header">
        <div className="word-readout">
          <div>
            <div>Current selection</div>
            <span>{currentWord || '—'}</span>
          </div>
          <button
            type="button"
            className="action"
            onClick={clear}
            disabled={!gameActive || selectedPath.length === 0}
          >
            Clear
          </button>
        </div>
        <div className="status-bar">
          <div className="status-chip">Time: {timerDisplay}</div>
          <div className="status-chip">Words: {wordsFound}</div>
          <div className="status-chip">Points: {roundPoints}</div>
          <div className="status-chip">Player: {playerName}</div>
          <div className="status-chip">High score: {playerHighScore}</div>
        </div>
      </div>

      <div className="game-body">
        <div className="grid-column">
          <WordGrid
            board={board}
            selectedPath={selectedPath}
            enabled={gameActive}
            isCellEnabled={isCellEnabled}
            onCellAction={handleCellAction}
          />
          <div className="guess-row grid-actions">
            <button type="button" className="guess" onClick={handleGuess} disabled={!canGuess}>
              Guess
            </button>
          </div>
        </div>
        <div className="guessed-column">
          <GuessedWordsPanel words={guessedWords} />
        </div>
        <div className="controls-column">
          <section className="control-card">
            <h3>Round controls</h3>
            <div className="button-grid">
              <button
                type="button"
                className="action success"
                onClick={startGame}
                disabled={gameActive || dictionaryLoading}
              >
                Start
              </button>
              <button type="button" className="action" onClick={handleRestart} disabled={!gameActive}>
                Restart
              </button>
              <button type="button" className="action danger" onClick={handleStopClick} disabled={!gameActive}>
                Stop game
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
          <section className="control-card">
            <h3>Settings</h3>
            <label className="stacked">
              <span>Timer</span>
              <select
                value={timerSeconds}
                onChange={(event) => setTimerSeconds(Number(event.target.value))}
                disabled={gameActive}
              >
                {TIMER_OPTIONS_SECONDS.map((seconds) => (
                  <option key={seconds} value={seconds}>
                    {formatDuration(seconds)}
                  </option>
                ))}
              </select>
            </label>
            <label className="stacked">
              <span>Language</span>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as GameLanguage)}
                disabled={gameActive}
              >
                <option value="english">English</option>
                <option value="bulgarian">Български</option>
              </select>
            </label>
            <button type="button" className="action" onClick={() => openLeaderboard()}>
              View leaderboard
            </button>
          </section>
          <section className="control-card general-info-card" role="status">
            <h3>Helpful info</h3>
            <ul>
              <li>
                {dictionaryLoading
                  ? 'Dictionary is loading…'
                  : `${dictionaryCount.toLocaleString()} words loaded (${languageLabel})`}
              </li>
              <li>Timer set to {formatDuration(timerSeconds)}</li>
              <li>Shortcuts: Enter = Guess · Backspace = Undo · Esc = Clear</li>
            </ul>
          </section>
        </div>
      </div>

      <EndOfGameModal open={showStatsModal} words={guessedWords} highScore={playerHighScore} onClose={handleStatsClose} />
      <LeaderboardModal
        open={showLeaderboard}
        entries={leaderboardEntries}
        timerSeconds={leaderboardTimer}
        highlightId={highlightEntryId}
        onClose={() => setShowLeaderboard(false)}
      />
    </div>
  )
}

function useSelectionManager(board: Cell[][]) {
  const [selectedPath, setSelectedPath] = useState<Cell[]>([])
  const candidatesRef = useRef<Cell[][]>([])
  const lockedPrefixRef = useRef<Cell[]>([])

  useEffect(() => {
    setSelectedPath([])
    candidatesRef.current = []
    lockedPrefixRef.current = []
  }, [board])

  const select = useCallback((cell: Cell) => {
    let nextPath: Cell[] | null = null
    let nextCandidates: Cell[][] | null = null
    setSelectedPath((prev) => {
      if (prev.length === 0) {
        const next = [cell]
        nextPath = next
        nextCandidates = [next]
        return next
      }
      const last = prev[prev.length - 1]
      if (last.id === cell.id) {
        const trimmed = prev.slice(0, -1)
        nextPath = trimmed
        nextCandidates = trimmed.length ? [trimmed] : []
        return trimmed
      }
      if (prev.some((existing) => existing.id === cell.id)) {
        return prev
      }
      if (!areNeighbors(last, cell)) {
        return prev
      }
      const next = [...prev, cell]
      nextPath = next
      nextCandidates = [next]
      return next
    })
    if (nextPath) {
      lockedPrefixRef.current = nextPath
      candidatesRef.current = nextCandidates ?? []
    }
  }, [])

  const typeLetter = useCallback(
    (letter: string) => {
      let nextCandidates: Cell[][] | null = null
      let releaseLock = false
      setSelectedPath((prev) => {
        const base = candidatesRef.current.length
          ? candidatesRef.current
          : prev.length
            ? [prev]
            : [[]]
        const desiredWord = prev.map((cell) => cell.letter).join('') + letter
        let next = extendCandidates(board, base, letter, lockedPrefixRef.current)
        if (next.length === 0 && desiredWord) {
          const fallback = findPathsForWord(board, desiredWord)
          if (fallback.length > 0) {
            next = fallback
            releaseLock = true
          }
        }
        if (next.length === 0) {
          return prev
        }
        nextCandidates = next
        return next[0]
      })
      if (nextCandidates) {
        candidatesRef.current = nextCandidates
        if (releaseLock) {
          lockedPrefixRef.current = []
        }
      }
    },
    [board],
  )

  const backspace = useCallback(() => {
    let nextCandidates: Cell[][] | null = null
    let nextLocked: Cell[] | null = null
    setSelectedPath((prev) => {
      if (prev.length === 0) return prev
      const targetLength = prev.length - 1
      if (targetLength === 0) {
        nextCandidates = []
        nextLocked = []
        return []
      }
      const base = candidatesRef.current.length ? candidatesRef.current : [prev]
      const trimmed = base.map((path) => path.slice(0, targetLength))
      const deduped = dedupePaths(trimmed)
      nextCandidates = deduped.length ? deduped : [prev.slice(0, targetLength)]
      nextLocked = lockedPrefixRef.current.slice(0, Math.min(targetLength, lockedPrefixRef.current.length))
      return nextCandidates[0]
    })
    if (nextCandidates && nextLocked !== null) {
      candidatesRef.current = nextCandidates
      lockedPrefixRef.current = nextLocked
    }
  }, [])

  const clear = useCallback(() => {
    setSelectedPath([])
    lockedPrefixRef.current = []
    candidatesRef.current = []
  }, [])

  const currentWord = useMemo(() => selectedPath.map((cell) => cell.letter).join(''), [selectedPath])

  return {
    selectedPath,
    select,
    typeLetter,
    backspace,
    clear,
    currentWord,
  }
}

function generateBoard(language: GameLanguage): Cell[][] {
  const weights = getWeights(language)
  const board: Cell[][] = []
  for (let row = 0; row < GRID_SIZE; row += 1) {
    const rowCells: Cell[] = []
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const letter = drawLetter(weights)
      rowCells.push({ row, col, letter, id: `${row}-${col}` })
    }
    board.push(rowCells)
  }
  return board
}

function drawLetter(weights: Array<[string, number]>) {
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0)
  let pick = Math.random() * total
  for (const [letter, weight] of weights) {
    pick -= weight
    if (pick <= 0) return letter
  }
  return weights[0][0]
}

function normalizeWord(word: string) {
  return word.toUpperCase()
}

function normalizeKey(language: GameLanguage, key: string) {
  if (language === 'english') {
    if (/^[a-zA-Z]$/.test(key)) {
      return key.toUpperCase()
    }
    return null
  }
  if (/^[\u0400-\u04FF]$/.test(key)) {
    return key.toUpperCase()
  }
  return null
}

function areNeighbors(a: Cell, b: Cell) {
  if (a.id === b.id) return false
  return Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1
}

function extendCandidates(board: Cell[][], candidates: Cell[][], letter: string, locked: Cell[]) {
  const results: Cell[][] = []
  const targetLetter = letter.toUpperCase()
  const prefixIds = locked.map((cell) => cell.id)

  const ensurePrefix = (path: Cell[]) => {
    if (!prefixIds.length) return true
    if (path.length < prefixIds.length) return false
    for (let i = 0; i < prefixIds.length; i += 1) {
      if (path[i].id !== prefixIds[i]) return false
    }
    return true
  }

  const pushPath = (path: Cell[]) => {
    if (!ensurePrefix(path)) {
      return
    }
    results.push(path)
  }

  if (candidates.length === 0) {
    for (const row of board) {
      for (const cell of row) {
        if (cell.letter === targetLetter) {
          pushPath([cell])
        }
      }
    }
    return dedupePaths(results)
  }

  for (const candidate of candidates) {
    if (candidate.length === 0) {
      for (const row of board) {
        for (const cell of row) {
          if (cell.letter === targetLetter) {
            pushPath([cell])
          }
        }
      }
      continue
    }
    const last = candidate[candidate.length - 1]
    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
        if (rowOffset === 0 && colOffset === 0) continue
        const nextRow = last.row + rowOffset
        const nextCol = last.col + colOffset
        if (nextRow < 0 || nextRow >= GRID_SIZE || nextCol < 0 || nextCol >= GRID_SIZE) continue
        const cell = board[nextRow][nextCol]
        if (cell.letter !== targetLetter) continue
        if (candidate.some((existing) => existing.id === cell.id)) continue
        pushPath([...candidate, cell])
      }
    }
  }

  return dedupePaths(results)
}

function findPathsForWord(board: Cell[][], word: string) {
  const target = word.toUpperCase()
  if (!target) return []
  const results: Cell[][] = []
  const rows = board.length
  const cols = board[0]?.length ?? 0

  const explore = (cell: Cell, depth: number, path: Cell[], visited: Set<string>) => {
    if (depth === target.length) {
      results.push([...path])
      return
    }
    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
        if (rowOffset === 0 && colOffset === 0) continue
        const nextRow = cell.row + rowOffset
        const nextCol = cell.col + colOffset
        if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) continue
        const nextCell = board[nextRow][nextCol]
        if (visited.has(nextCell.id)) continue
        if (nextCell.letter !== target[depth]) continue
        visited.add(nextCell.id)
        path.push(nextCell)
        explore(nextCell, depth + 1, path, visited)
        path.pop()
        visited.delete(nextCell.id)
      }
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cell = board[row][col]
      if (cell.letter !== target[0]) continue
      if (target.length === 1) {
        results.push([cell])
        continue
      }
      const visited = new Set<string>([cell.id])
      const path = [cell]
      explore(cell, 1, path, visited)
    }
  }

  return dedupePaths(results)
}

function dedupePaths(paths: Cell[][]) {
  const seen = new Map<string, Cell[]>()
  for (const path of paths) {
    const key = path.map((cell) => cell.id).join('-')
    if (!seen.has(key)) {
      seen.set(key, path)
    }
  }
  return Array.from(seen.values())
}

function safeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}
