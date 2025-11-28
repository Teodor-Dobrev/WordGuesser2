import type { LeaderboardEntry } from '../game/types'

const STORAGE_KEY = 'wordguesser:leaderboard'
const HIGH_SCORE_KEY = 'sideprojects:highscores'
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

type HighScoreBuckets = Record<string, Record<string, number>>

function readHighScoreStore(): HighScoreBuckets {
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

function writeHighScoreStore(store: HighScoreBuckets) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(store))
  } catch (error) {
    console.warn('Unable to persist high-score store', error)
  }
}

export function getPlayerHighScore(gameId: string, player: string) {
  const store = readHighScoreStore()
  return store[gameId]?.[player] ?? 0
}

export function recordPlayerHighScore(gameId: string, player: string, candidate: number) {
  if (candidate <= 0) {
    return getPlayerHighScore(gameId, player)
  }
  const store = readHighScoreStore()
  const bucket = store[gameId] ?? {}
  const current = bucket[player] ?? 0
  if (candidate <= current) {
    return current
  }
  bucket[player] = candidate
  store[gameId] = bucket
  writeHighScoreStore(store)
  return candidate
}
