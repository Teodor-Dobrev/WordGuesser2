import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import type { GameLanguage } from '../game/types'
import { loadDictionary } from '../../services/dictionaryLoader'
import { getPlayerHighScore, recordPlayerHighScore } from '../leaderboard/storage'

const TYPERACER_GAME_ID = 'typeracer'
const SNIPPET_WORD_COUNT = 28
const FALLBACK_SNIPPETS: Record<GameLanguage, string[]> = {
  english: [
    'the quick brown fox still loves typing practice on neon keyboards',
    'react hooks keep state predictable when the timer is racing down',
    'accuracy matters more than brute speed in every clean type test',
  ],
  bulgarian: [
    'всяка вечер клавишите светят и думите се подреждат сами',
    'точността е първа приятелка на скоростта в едно добро писане',
    'черната магия на бързото писане е само навик и малко ритуал',
  ],
}

type RaceStatus = 'idle' | 'running' | 'finished'

interface TypeRacerGameProps {
  playerName: string
  onResetPlayer: () => void
  onSwitchProject?: () => void
}

export function TypeRacerGame({ playerName, onResetPlayer, onSwitchProject }: TypeRacerGameProps) {
  const [language, setLanguage] = useState<GameLanguage>('english')
  const [dictionary, setDictionary] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [snippet, setSnippet] = useState('')
  const [typedValue, setTypedValue] = useState('')
  const [status, setStatus] = useState<RaceStatus>('idle')
  const [bestWpm, setBestWpm] = useState(() => getPlayerHighScore(TYPERACER_GAME_ID, playerName, 'english'))
  const [metrics, setMetrics] = useState({ wpm: 0, accuracy: 100, elapsedMs: 0 })
  const [result, setResult] = useState<{ wpm: number; accuracy: number; durationMs: number } | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setDictionary([])
    setSnippet('')
    setStatus('idle')
    setTypedValue('')
    setResult(null)
    setMetrics({ wpm: 0, accuracy: 100, elapsedMs: 0 })
    startTimeRef.current = null
    ;(async () => {
      try {
        const raw = await loadDictionary(language)
        if (cancelled) return
        const words = Array.from(raw)
        setDictionary(words)
        setSnippet(generateSnippet(words, language))
      } catch (error) {
        console.warn('Unable to load Type Racer dictionary', error)
        if (!cancelled) {
          setDictionary([])
          setSnippet(pickFallbackSnippet(language))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [language])

  useEffect(() => {
    setBestWpm(getPlayerHighScore(TYPERACER_GAME_ID, playerName, language))
  }, [language, playerName])

  const snippetChars = useMemo(() => snippet.split(''), [snippet])
  const snippetWordLayout = useMemo(() => buildSnippetWords(snippet), [snippet])
  const typedWords = useMemo(() => splitTypedWords(typedValue), [typedValue])
  const charStates = useMemo(() => mapCharStates(snippetWordLayout, typedWords, snippet.length), [snippetWordLayout, typedWords, snippet.length])

  const renderedSnippet = useMemo(() => {
    if (!snippet) return null
    return snippetChars.map((char, index) => {
      const state = charStates[index] ?? ''
      return (
        <span key={`char-${index}`} className={`typeracer-char ${state}`}>
          {char === ' ' ? '\u00A0' : char}
        </span>
      )
    })
  }, [charStates, snippetChars])

  const handleStart = useCallback(() => {
    if (!snippet || isLoading) return
    setStatus('running')
    setTypedValue('')
    setResult(null)
    setMetrics({ wpm: 0, accuracy: 100, elapsedMs: 0 })
    startTimeRef.current = Date.now()
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [isLoading, snippet])

  const regenerateSnippet = useCallback(() => {
    if (status === 'running') return
    const next = dictionary.length ? generateSnippet(dictionary, language) : pickFallbackSnippet(language)
    setSnippet(next)
    setTypedValue('')
    setResult(null)
    setMetrics({ wpm: 0, accuracy: 100, elapsedMs: 0 })
    setStatus('idle')
    startTimeRef.current = null
  }, [dictionary, language, status])

  const stopRace = useCallback(() => {
    if (status !== 'running') return
    setStatus('idle')
    setTypedValue('')
    setResult(null)
    setMetrics({ wpm: 0, accuracy: 100, elapsedMs: 0 })
    startTimeRef.current = null
  }, [status])

  const finalizeRace = useCallback(
    (elapsedMs: number, accuracy: number) => {
      const finalWpm = computeWpm(snippet.length, elapsedMs)
      setStatus('finished')
      setResult({ wpm: finalWpm, accuracy, durationMs: elapsedMs })
      startTimeRef.current = null
      const updated = recordPlayerHighScore(TYPERACER_GAME_ID, playerName, finalWpm, { scope: language })
      setBestWpm(updated)
    },
    [language, playerName, snippet],
  )

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      if (status !== 'running') return
      const rawValue = event.target.value
      const nextValue = rawValue.slice(0, snippet.length)
      setTypedValue(nextValue)
      const startTime = startTimeRef.current
      if (!startTime) return
      const now = Date.now()
      const elapsed = Math.max(0, now - startTime)
      const { correctChars, accuracy } = evaluateProgress(nextValue, snippetWordLayout)
      const liveWpm = computeWpm(correctChars, elapsed)
      setMetrics({
        wpm: liveWpm,
        accuracy,
        elapsedMs: elapsed,
      })
      if (nextValue === snippet) {
        finalizeRace(elapsed, accuracy)
      }
    },
    [snippet, snippetWordLayout, status, finalizeRace],
  )

  const currentElapsed = status === 'finished' && result ? result.durationMs : metrics.elapsedMs
  const currentWpm = status === 'finished' && result ? result.wpm : metrics.wpm
  const currentAccuracy = status === 'finished' && result ? result.accuracy : metrics.accuracy

  return (
    <div className="panel typeracer-panel">
      <header className="typeracer-header">
        <div>
          <p className="eyebrow">Type Racer</p>
          <h1>Hit the keys, chase perfect accuracy.</h1>
          <p>The prompt pulls straight from our dictionaries. Finish it clean to lock a new personal best.</p>
        </div>
        <div className="typeracer-actions">
          <label>
            <span>Language</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value as GameLanguage)} disabled={status === 'running'}>
              <option value="english">English</option>
              <option value="bulgarian">Български</option>
            </select>
          </label>
          <button type="button" className="action success" onClick={handleStart} disabled={!snippet || isLoading || status === 'running'}>
            {isLoading ? 'Loading…' : status === 'finished' ? 'Race again' : 'Start race'}
          </button>
          <button type="button" className="action" onClick={regenerateSnippet} disabled={status === 'running' || isLoading}>
            New snippet
          </button>
          <button type="button" className="action danger" onClick={stopRace} disabled={status !== 'running'}>
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

      <section className="typeracer-scoreboard">
        <div className="score-chip">Player: {playerName}</div>
        <div className="score-chip">Current WPM: {currentWpm.toFixed(1)}</div>
        <div className="score-chip">Accuracy: {currentAccuracy}%</div>
        <div className="score-chip">Elapsed: {formatElapsed(currentElapsed)}</div>
        <div className="score-chip">Best ({language === 'english' ? 'English' : 'Български'}): {bestWpm.toFixed(1)}</div>
      </section>

      <section className="typeracer-snippet-card">
        <div className="typeracer-snippet" aria-label="Typing prompt">
          {renderedSnippet || <span className="muted">Loading snippet…</span>}
        </div>
        <textarea
          ref={inputRef}
          className="typeracer-input"
          value={typedValue}
          onChange={handleInputChange}
          onPaste={(event) => event.preventDefault()}
          placeholder={status === 'running' ? 'Type the prompt exactly…' : 'Press Start race to begin typing'}
          disabled={status !== 'running'}
          rows={4}
        />
        {result && (
          <div className="typeracer-result">
            <p>
              Finished in <strong>{formatElapsed(result.durationMs)}</strong> at <strong>{result.wpm.toFixed(1)} WPM</strong> with <strong>{result.accuracy}% accuracy</strong>.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

function generateSnippet(words: string[], language: GameLanguage) {
  const sanitized = words
    .map((word) => normalizeWordForSnippet(word))
    .filter((word) => isSnippetWord(word, language))

  if (!sanitized.length) {
    return pickFallbackSnippet(language)
  }

  const result: string[] = []
  for (let i = 0; i < SNIPPET_WORD_COUNT; i += 1) {
    result.push(sanitized[Math.floor(Math.random() * sanitized.length)])
  }
  return result.join(' ')
}

function pickFallbackSnippet(language: GameLanguage) {
  const snippets = FALLBACK_SNIPPETS[language]
  return snippets[Math.floor(Math.random() * snippets.length)]
}

function normalizeWordForSnippet(word: string) {
  return word.toLowerCase()
}

function isSnippetWord(word: string, language: GameLanguage) {
  if (!word) return false
  if (language === 'english') {
    return /^[a-z]{3,12}$/.test(word)
  }
  return /^[а-яё]{3,12}$/u.test(word)
}

function evaluateProgress(input: string, layout: WordLayout[]) {
  if (!layout.length) return { correctChars: 0, accuracy: 100 }
  const typedWords = splitTypedWords(input)
  let correctChars = 0
  let typedChars = 0
  layout.forEach((segment, index) => {
    const typedWord = typedWords[index] ?? ''
    const comparison = compareWord(segment.word, typedWord)
    correctChars += comparison.correct
    typedChars += typedWord.length
  })
  if (typedWords.length > layout.length) {
    for (let i = layout.length; i < typedWords.length; i += 1) {
      typedChars += typedWords[i].length
    }
  }
  const accuracy = typedChars ? Math.round((correctChars / typedChars) * 100) : 100
  return { correctChars, accuracy }
}

function computeWpm(correctChars: number, elapsedMs: number) {
  if (!correctChars || !elapsedMs) return 0
  const wordsPerMinute = (correctChars / 5) / (elapsedMs / 60000)
  return Number(wordsPerMinute.toFixed(1))
}

function formatElapsed(elapsedMs: number) {
  if (!elapsedMs) return '00:00'
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

interface WordLayout {
  word: string
  start: number
}

function buildSnippetWords(snippet: string): WordLayout[] {
  const segments: WordLayout[] = []
  let wordStart = -1
  for (let i = 0; i <= snippet.length; i += 1) {
    const char = snippet[i]
    const isSeparator = char === ' ' || char === '\n' || char === '\r' || typeof char === 'undefined'
    if (!isSeparator) {
      if (wordStart === -1) {
        wordStart = i
      }
    } else if (wordStart !== -1) {
      segments.push({ word: snippet.slice(wordStart, i), start: wordStart })
      wordStart = -1
    }
  }
  return segments
}

function splitTypedWords(value: string) {
  if (!value) return ['']
  const normalized = value.trimStart()
  if (!normalized) return ['']
  return normalized.split(/\s+/)
}

function mapCharStates(layout: WordLayout[], typedWords: string[], totalLength: number) {
  const states = new Array(totalLength).fill('')
  layout.forEach((segment, index) => {
    const typedWord = typedWords[index] ?? ''
    const comparison = compareWord(segment.word, typedWord)
    comparison.states.forEach((state, offset) => {
      if (!state) return
      states[segment.start + offset] = state
    })
  })
  return states
}

interface WordComparison {
  states: string[]
  correct: number
}

function compareWord(target: string, typed: string): WordComparison {
  const states = new Array(target.length).fill('')
  let targetIndex = 0
  let typedIndex = 0
  let correct = 0
  while (targetIndex < target.length && typedIndex < typed.length) {
    const targetChar = target[targetIndex]
    const typedChar = typed[typedIndex]
    if (typedChar === targetChar) {
      states[targetIndex] = 'correct'
      correct += 1
      targetIndex += 1
      typedIndex += 1
      continue
    }
    if (targetIndex + 1 < target.length && typedChar === target[targetIndex + 1]) {
      states[targetIndex] = 'error'
      targetIndex += 1
      continue
    }
    states[targetIndex] = 'error'
    targetIndex += 1
    typedIndex += 1
  }
  return { states, correct }
}
