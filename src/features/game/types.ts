export type GameLanguage = 'english' | 'bulgarian'

export interface Cell {
  row: number
  col: number
  letter: string
  id: string
}

export type GameStatus = 'idle' | 'running' | 'ended'

export interface DefinitionSummary {
  word: string
  short: string
  source: 'api' | 'cache' | 'fallback' | 'local'
  savedAt: number
  raw?: unknown
}

export interface GuessedWord {
  word: string
  points: number
  definition?: DefinitionSummary | null
  timestamp: number
}

export interface LeaderboardEntry {
  id: string
  player: string
  points: number
  words: number
  timerSeconds: number
  finishedAt: string
}
