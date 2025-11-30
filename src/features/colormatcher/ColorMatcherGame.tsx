import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getPlayerHighScore, recordPlayerHighScore } from '../leaderboard/storage'

type Difficulty = 'relax' | 'steady' | 'rapid' | 'insane'

interface DifficultyConfig {
  size: number
  hueDelta: number
  lightnessDelta: number
  timeLimitMs: number
}

const COLOR_MATCHER_GAME_ID = 'colormatcher'

const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  relax: { size: 3, hueDelta: 18, lightnessDelta: 6, timeLimitMs: 8000 },
  steady: { size: 4, hueDelta: 12, lightnessDelta: 5, timeLimitMs: 7000 },
  rapid: { size: 5, hueDelta: 8, lightnessDelta: 4, timeLimitMs: 6000 },
  insane: { size: 6, hueDelta: 5, lightnessDelta: 3, timeLimitMs: 5200 },
}

type RoundState = 'idle' | 'running' | 'failed'

interface ColorMatcherGameProps {
  playerName: string
  onResetPlayer: () => void
  onSwitchProject?: () => void
}

interface GeneratedRound {
  palette: string[]
  targetIndex: number
}

export function ColorMatcherGame({ playerName, onResetPlayer, onSwitchProject }: ColorMatcherGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('steady')
  const [roundState, setRoundState] = useState<RoundState>('idle')
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(() => getPlayerHighScore(COLOR_MATCHER_GAME_ID, playerName, 'steady'))
  const [palette, setPalette] = useState<string[]>([])
  const [targetIndex, setTargetIndex] = useState(0)
  const [timeLeftMs, setTimeLeftMs] = useState(DIFFICULTY_CONFIG.steady.timeLimitMs)
  const timerRef = useRef<number | null>(null)
  const deadlineRef = useRef<number>(0)

  const config = DIFFICULTY_CONFIG[difficulty]
  const gridTemplateColumns = useMemo(() => `repeat(${config.size}, minmax(0, 1fr))`, [config.size])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    setBestStreak(getPlayerHighScore(COLOR_MATCHER_GAME_ID, playerName, difficulty))
    setStreak(0)
    setTimeLeftMs(config.timeLimitMs)
    stopTimer()
    setRoundState('idle')
  }, [config.timeLimitMs, difficulty, playerName, stopTimer])

  useEffect(() => {
    return () => stopTimer()
  }, [stopTimer])

  const startTimer = useCallback(() => {
    stopTimer()
    deadlineRef.current = Date.now() + config.timeLimitMs
    setTimeLeftMs(config.timeLimitMs)
    timerRef.current = window.setInterval(() => {
      const remaining = Math.max(0, deadlineRef.current - Date.now())
      setTimeLeftMs(remaining)
      if (remaining <= 0) {
        window.clearInterval(timerRef.current ?? undefined)
        timerRef.current = null
        handleMiss('time')
      }
    }, 100)
  }, [config.timeLimitMs, stopTimer])

  const buildRound = useCallback(() => {
    const round = generateRound(config)
    setPalette(round.palette)
    setTargetIndex(round.targetIndex)
  }, [config])

  const beginRound = useCallback(() => {
    buildRound()
    setRoundState('running')
    startTimer()
  }, [buildRound, startTimer])

  const stopRound = useCallback(() => {
    setRoundState('idle')
    setStreak(0)
    stopTimer()
    setTimeLeftMs(config.timeLimitMs)
  }, [config.timeLimitMs, stopTimer])

  const handleMiss = useCallback(
    (reason: 'time' | 'wrong') => {
      void reason
      stopTimer()
      setRoundState('failed')
      setStreak(0)
    },
    [stopTimer],
  )

  const handleTileClick = useCallback(
    (index: number) => {
      if (roundState !== 'running') return
      if (index === targetIndex) {
        const nextStreak = streak + 1
        setStreak(nextStreak)
        const updated = recordPlayerHighScore(COLOR_MATCHER_GAME_ID, playerName, nextStreak, { scope: difficulty })
        setBestStreak(updated)
        buildRound()
        startTimer()
      } else {
        handleMiss('wrong')
      }
    },
    [buildRound, difficulty, handleMiss, playerName, roundState, startTimer, streak, targetIndex],
  )

  const formattedTime = useMemo(() => formatCountdown(timeLeftMs), [timeLeftMs])

  return (
    <div className="panel colormatcher-panel">
      <header className="colormatcher-header">
        <div>
          <p className="eyebrow">Color Matcher</p>
          <h1>🎨 Spot the odd tile before the clock hits zero.</h1>
          <p>The grid shrinks the hue gap each difficulty step. Keep your streak alive for as long as you can.</p>
        </div>
        <div className="colormatcher-actions">
          <label>
            <span>Difficulty</span>
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)} disabled={roundState === 'running'}>
              <option value="relax">Relax</option>
              <option value="steady">Steady</option>
              <option value="rapid">Rapid</option>
              <option value="insane">Insane</option>
            </select>
          </label>
          <button type="button" className="action success" onClick={beginRound} disabled={roundState === 'running'}>
            {roundState === 'running' ? 'Round active' : 'Start round'}
          </button>
          <button type="button" className="action" onClick={buildRound} disabled={roundState !== 'running'}>
            Shuffle colors
          </button>
          <button type="button" className="action danger" onClick={stopRound}>
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
      </header>

      <section className="colormatcher-scoreboard">
        <div className="score-chip">Player: {playerName}</div>
        <div className="score-chip">Difficulty: {labelDifficulty(difficulty)}</div>
        <div className="score-chip">Streak: {streak}</div>
        <div className="score-chip">Best: {bestStreak}</div>
        <div className={`score-chip ${timeLeftMs < config.timeLimitMs / 3 ? 'warning' : ''}`}>Time left: {formattedTime}</div>
      </section>

      {roundState === 'failed' && (
        <p className="status-message danger">Missed it! Your streak reset. Start a new round when ready.</p>
      )}

      <section className="colormatcher-grid" style={{ gridTemplateColumns }}>
        {Array.from({ length: config.size * config.size }).map((_, index) => {
          const color = palette[index] ?? '#dbeafe'
          return (
            <button
              key={index}
              type="button"
              className="color-tile"
              style={{ backgroundColor: color }}
              onClick={() => handleTileClick(index)}
              disabled={roundState !== 'running'}
            />
          )
        })}
      </section>
    </div>
  )
}

function formatCountdown(ms: number) {
  const clamped = Math.max(0, ms)
  const seconds = Math.floor(clamped / 1000)
  const tenths = Math.floor((clamped % 1000) / 100)
  return `${seconds}.${tenths}s`
}

function labelDifficulty(difficulty: Difficulty) {
  switch (difficulty) {
    case 'relax':
      return 'Relax'
    case 'steady':
      return 'Steady'
    case 'rapid':
      return 'Rapid'
    case 'insane':
      return 'Insane'
    default:
      return difficulty
  }
}

function generateRound(config: DifficultyConfig): GeneratedRound {
  const totalTiles = config.size * config.size
  const targetIndex = Math.floor(Math.random() * totalTiles)
  const baseHue = Math.floor(Math.random() * 360)

  // Detect if the base color is greenish (90–150°)
  const isGreen = baseHue >= 90 && baseHue <= 150
  // Boost deltas for green hues
  const hueDelta = isGreen ? config.hueDelta * 2.2 : config.hueDelta
  const lightnessDelta = isGreen ? config.lightnessDelta * 1.7 : config.lightnessDelta

  const baseColor = buildColor(baseHue, 60, 55)
  const palette = Array.from({ length: totalTiles }, () => baseColor)
  const specialHue = wrapHue(baseHue + randomSign() * hueDelta)
  const specialLightness = clamp(40, 65, 55 + randomSign() * lightnessDelta)
  palette[targetIndex] = buildColor(specialHue, 60, specialLightness)
  return { palette, targetIndex }
}

function buildColor(h: number, s: number, l: number) {
  return `hsl(${h}deg ${s}% ${l}%)`
}

function wrapHue(value: number) {
  const mod = value % 360
  return mod < 0 ? mod + 360 : mod
}

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value))
}

function randomSign() {
  return Math.random() > 0.5 ? 1 : -1
}
