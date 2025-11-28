import type { LeaderboardEntry } from '../game/types'

const STORAGE_KEY = 'wordguesser:leaderboard'
const HIGH_SCORE_KEY = 'wordguesser:highscores'
const MAX_PER_BUCKET = 20

function readStore(): Record<string, LeaderboardEntry[]> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch (error) {
    console.warn('Unable to read leaderboard', error)
    return {}
  }
}

function writeStore(store: Record<string, LeaderboardEntry[]>) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch (error) {
    console.warn('Unable to persist leaderboard', error)
  }
}

export function recordLeaderboardEntry(entry: LeaderboardEntry) {
  const bucketKey = String(entry.timerSeconds)
  const store = readStore()
  const bucket = store[bucketKey] ?? []
  const updated = [...bucket, entry]
    .sort((a, b) => b.points - a.points || b.words - a.words || a.finishedAt.localeCompare(b.finishedAt))
    .slice(0, MAX_PER_BUCKET)
  store[bucketKey] = updated
  writeStore(store)
  return updated
}

export function getLeaderboard(timerSeconds: number) {
  const bucketKey = String(timerSeconds)
  const store = readStore()
  return store[bucketKey] ?? []
}

function readHighScoreStore(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch (error) {
    console.warn('Unable to read high-score store', error)
    return {}
  }
}

function writeHighScoreStore(store: Record<string, number>) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(store))
  } catch (error) {
    console.warn('Unable to persist high-score store', error)
  }
}

export function getPlayerHighScore(player: string) {
  const store = readHighScoreStore()
  return store[player] ?? 0
}

export function recordPlayerHighScore(player: string, candidate: number) {
  if (candidate <= 0) {
    return getPlayerHighScore(player)
  }
  const store = readHighScoreStore()
  const current = store[player] ?? 0
  if (candidate <= current) {
    return current
  }
  store[player] = candidate
  writeHighScoreStore(store)
  return candidate
}
