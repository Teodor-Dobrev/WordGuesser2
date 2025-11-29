import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DefinitionSummary, GameLanguage } from '../game/types'
import { loadDictionary } from '../../services/dictionaryLoader'
import { getDefinition } from '../../services/definitionsCache'
import { getPlayerHighScore, recordPlayerHighScore } from '../leaderboard/storage'

const HANGMAN_GAME_ID = 'hangman'
const MAX_MISTAKES = 6
const MAX_DEFINITION_ATTEMPTS = 10
const MAX_DEFINED_BULGARIAN_WORDS = 600
const MIN_DEFINED_BULGARIAN_WORDS = 80
const FALLBACK_WORDS: Record<GameLanguage, string[]> = {
  english: ['PUZZLE', 'GALAXY', 'VECTOR', 'NEBULA', 'REACT', 'PYTHON'],
  bulgarian: ['КОМПЮТЪР', 'ДЪЖД', 'СЪРЦЕ', 'НЕБЕ', 'УЧИЛИЩЕ', 'ТРАФИК'],
}

const LETTERS: Record<GameLanguage, string[]> = {
  english: Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
  bulgarian: Array.from('АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЬЮЯ'),
}

const TARGET_COMMON_WORDS = 480
const TARGET_RARE_WORDS = 40

const LETTER_WEIGHTS: Record<GameLanguage, Record<string, number>> = {
  english: {
    A: 8.2,
    B: 1.5,
    C: 2.8,
    D: 4.3,
    E: 12.7,
    F: 2.2,
    G: 2.0,
    H: 6.1,
    I: 7.0,
    J: 0.15,
    K: 0.8,
    L: 4.0,
    M: 2.4,
    N: 6.7,
    O: 7.5,
    P: 1.9,
    Q: 0.1,
    R: 6.0,
    S: 6.3,
    T: 9.1,
    U: 2.8,
    V: 1.0,
    W: 2.4,
    X: 0.15,
    Y: 2.0,
    Z: 0.07,
  },
  bulgarian: {
    А: 11.3,
    Б: 1.5,
    В: 3.9,
    Г: 1.3,
    Д: 3.2,
    Е: 9.8,
    Ж: 0.9,
    З: 1.5,
    И: 9.0,
    Й: 0.8,
    К: 3.6,
    Л: 3.8,
    М: 3.2,
    Н: 6.7,
    О: 10.4,
    П: 2.3,
    Р: 4.7,
    С: 4.5,
    Т: 6.2,
    У: 2.0,
    Ф: 0.4,
    Х: 0.8,
    Ц: 0.4,
    Ч: 1.3,
    Ш: 0.9,
    Щ: 0.3,
    Ъ: 2.5,
    Ю: 0.5,
    Я: 2.2,
    Ь: 0.2,
  },
}

type RoundStatus = 'idle' | 'playing' | 'won' | 'lost'

interface HangmanGameProps {
  playerName: string
  onResetPlayer: () => void
  onSwitchProject?: () => void
}

export function HangmanGame({ playerName, onResetPlayer, onSwitchProject }: HangmanGameProps) {
  const [language, setLanguage] = useState<GameLanguage>('english')
  const [dictionary, setDictionary] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [secretWord, setSecretWord] = useState('')
  const [correctLetters, setCorrectLetters] = useState<string[]>([])
  const [wrongLetters, setWrongLetters] = useState<string[]>([])
  const [status, setStatus] = useState<RoundStatus>('idle')
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(() => getPlayerHighScore(HANGMAN_GAME_ID, playerName, 'english'))
  const [wordDefinition, setWordDefinition] = useState<DefinitionSummary | null>(null)
  const [isChoosingWord, setIsChoosingWord] = useState(false)
  const selectionNonceRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setDictionary([])
    ;(async () => {
      try {
        const setResult = await loadDictionary(language)
        if (cancelled) return
        let curated = curateHangmanWords(Array.from(setResult), language)
        if (language === 'bulgarian') {
          curated = await ensureBulgarianDefinitions(curated)
          if (cancelled) return
        }
        setDictionary(curated)
      } catch (error) {
        console.warn('Failed to load hangman dictionary', error)
        if (!cancelled) {
          setDictionary(FALLBACK_WORDS[language])
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
    setBestStreak(getPlayerHighScore(HANGMAN_GAME_ID, playerName, language))
  }, [language, playerName])

  const handleLetter = useCallback(
    (letter: string) => {
      if (status !== 'playing' || !secretWord) return
      if (correctLetters.includes(letter) || wrongLetters.includes(letter)) return
      if (secretWord.includes(letter)) {
        const nextCorrect = [...correctLetters, letter]
        setCorrectLetters(nextCorrect)
        const solved = Array.from(new Set(secretWord.split(''))).every((char) => nextCorrect.includes(char))
        if (solved) {
          const newStreak = streak + 1
          setStreak(newStreak)
          const updated = recordPlayerHighScore(HANGMAN_GAME_ID, playerName, newStreak, {
            scope: language,
          })
          setBestStreak(updated)
          setStatus('won')
        }
      } else {
        const nextWrong = [...wrongLetters, letter]
        setWrongLetters(nextWrong)
        if (nextWrong.length >= MAX_MISTAKES) {
          setStatus('lost')
          setStreak(0)
        }
      }
    },
    [correctLetters, wrongLetters, status, secretWord, streak, playerName, language],
  )

  useEffect(() => {
    if (status !== 'playing') return
    const handler = (event: KeyboardEvent) => {
      const letter = normalizeLetter(event.key, language)
      if (!letter) return
      event.preventDefault()
      handleLetter(letter)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleLetter, language, status])

  const maskedWord = useMemo(() => {
    if (!secretWord) return '—'
    return secretWord
      .split('')
      .map((char) => (correctLetters.includes(char) ? char : '—'))
      .join(' ')
  }, [correctLetters, secretWord])

  const mistakesLeft = MAX_MISTAKES - wrongLetters.length
  const showDefinition = hasUsableDefinition(wordDefinition)

  const beginRound = useCallback(() => {
    if (isLoading || dictionary.length === 0 || isChoosingWord) return
    const nonce = selectionNonceRef.current + 1
    selectionNonceRef.current = nonce
    setIsChoosingWord(true)
    setStatus('idle')
    setSecretWord('')
    setCorrectLetters([])
    setWrongLetters([])
    setWordDefinition(null)

    ;(async () => {
      try {
        const selection = await selectPlayableWord(dictionary, language, MAX_DEFINITION_ATTEMPTS)
        if (selectionNonceRef.current !== nonce) return
        setSecretWord(selection.word)
        setWordDefinition(selection.definition ?? null)
        setStatus('playing')
      } catch (error) {
        console.warn('Unable to choose hangman word', error)
        if (selectionNonceRef.current !== nonce) return
        const fallbackWord = pickWord(dictionary)
        setSecretWord(fallbackWord)
        setStatus('playing')
      } finally {
        if (selectionNonceRef.current === nonce) {
          setIsChoosingWord(false)
        }
      }
    })()
  }, [dictionary, isChoosingWord, isLoading, language])

  const stopRound = useCallback(() => {
    if (status === 'playing') {
      const confirmStop = window.confirm('Stop the current word? Your streak will reset.')
      if (!confirmStop) return
    }
    selectionNonceRef.current += 1
    setStatus('idle')
    setSecretWord('')
    setCorrectLetters([])
    setWrongLetters([])
    setStreak(0)
    setIsChoosingWord(false)
    setWordDefinition(null)
  }, [status])

  const restartRound = useCallback(() => {
    if (status === 'playing') {
      const confirmed = window.confirm('Restart this word?')
      if (!confirmed) return
    }
    beginRound()
  }, [beginRound, status])

  return (
    <div className="panel hangman-panel">
      <header className="hangman-header">
        <div>
          <p className="eyebrow">HangMan</p>
          <h1>Guess the word before the rope runs out</h1>
          <p>Drag-free challenge: just letters, logic, and a ticking gallows.</p>
        </div>
        <div className="hangman-actions">
          <label>
            <span>Language</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value as GameLanguage)} disabled={status === 'playing' || isChoosingWord}>
              <option value="english">English</option>
              <option value="bulgarian">Български</option>
            </select>
          </label>
          <button type="button" className="action success" onClick={beginRound} disabled={isLoading || status === 'playing' || isChoosingWord}>
            {isChoosingWord ? 'Choosing…' : isLoading ? 'Loading…' : secretWord ? 'New word' : 'Start'}
          </button>
          <button type="button" className="action" onClick={restartRound} disabled={status !== 'playing'}>
            Restart
          </button>
          <button type="button" className="action danger" onClick={stopRound} disabled={status === 'idle' && !isChoosingWord}>
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

      <section className="hangman-scoreboard">
        <div className="score-chip">Player: {playerName}</div>
        <div className="score-chip">Streak: {streak}</div>
        <div className="score-chip">Best ({language === 'english' ? 'English' : 'Български'}): {bestStreak}</div>
        <div className="score-chip">Mistakes left: {mistakesLeft}</div>
      </section>

      <div className="hangman-body">
        <HangmanFigure mistakes={wrongLetters.length} />
        <div className="hangman-word">
          {isChoosingWord ? (
            <p className="status-message">Choosing a word...</p>
          ) : (
            <>
              <span>{maskedWord}</span>
              {status === 'won' && <p className="status-message success">Nice! Keep the streak going.</p>}
              {status === 'lost' && secretWord && (
                <p className="status-message danger">
                  Out of lives. The word was <strong>{secretWord}</strong>.
                </p>
              )}
              {(status === 'won' || status === 'lost') && showDefinition && wordDefinition && (
                <p className="hangman-definition">
                  <strong>Definition:</strong> {wordDefinition.short}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="hangman-letters">
        {LETTERS[language].map((letter) => {
          const guessed = correctLetters.includes(letter) || wrongLetters.includes(letter)
          const variant = correctLetters.includes(letter) ? 'correct' : wrongLetters.includes(letter) ? 'wrong' : ''
          return (
            <button
              key={letter}
              type="button"
              className={`hangman-key ${variant}`}
              onClick={() => handleLetter(letter)}
              disabled={status !== 'playing' || guessed || isChoosingWord}
            >
              {letter}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function curateHangmanWords(rawWords: string[], language: GameLanguage) {
  const sanitized = rawWords.map((word) => sanitizeWord(word))
  const filtered = sanitized.filter((word) => filterWord(word, language))
  const unique = Array.from(new Set(filtered))
  if (!unique.length) {
    return FALLBACK_WORDS[language]
  }

  const scored = unique.map((word) => ({
    word,
    score: scoreWord(word, language),
  }))

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (a.word.length !== b.word.length) return a.word.length - b.word.length
    return a.word.localeCompare(b.word)
  })

  const commonCount = Math.min(scored.length, TARGET_COMMON_WORDS)
  const rareCount = Math.min(Math.max(scored.length - commonCount, 0), TARGET_RARE_WORDS)
  const rareStart = Math.max(scored.length - rareCount, commonCount)
  const commonWords = scored.slice(0, commonCount).map((entry) => entry.word)
  const rareWords = rareCount > 0 ? scored.slice(rareStart).map((entry) => entry.word) : []
  const curated = [...commonWords, ...rareWords]

  if (curated.length >= 50) {
    return curated
  }

  return curated.length ? curated : FALLBACK_WORDS[language]
}

function scoreWord(word: string, language: GameLanguage) {
  const weights = LETTER_WEIGHTS[language]
  const totalWeight = word.split('').reduce((sum, letter) => sum + (weights[letter] ?? 0.35), 0)
  let lengthFactor = 1
  if (word.length >= 4 && word.length <= 7) {
    lengthFactor = 1.15
  } else if (word.length >= 8 && word.length <= 10) {
    lengthFactor = 0.95
  } else if (word.length > 10) {
    lengthFactor = 0.85
  }
  return (totalWeight / word.length) * lengthFactor
}

function sanitizeWord(word: string) {
  return word.toUpperCase().replace(/[^A-Z\u0400-\u04FF]/g, '')
}

function filterWord(word: string, language: GameLanguage) {
  if (language === 'english' && !/^[A-Z]+$/.test(word)) return false
  if (language === 'bulgarian' && !/^[\u0400-\u04FF]+$/.test(word)) return false
  return word.length >= 4 && word.length <= 12
}

function pickWord(list: string[]) {
  return list[Math.floor(Math.random() * list.length)]
}

async function ensureBulgarianDefinitions(words: string[]) {
  const definable: string[] = []
  for (const word of words) {
    try {
      const definition = await getDefinition(word, 'bulgarian')
      if (hasUsableDefinition(definition)) {
        definable.push(word)
      }
    } catch (error) {
      console.warn('Bulgarian definition probe failed', { word, error })
    }
    if (definable.length >= MAX_DEFINED_BULGARIAN_WORDS) {
      break
    }
  }
  if (definable.length >= MIN_DEFINED_BULGARIAN_WORDS) {
    return definable
  }
  return definable.length ? definable : words
}

// Try to seed each round with a word that already has a usable definition to show players immediately.
async function selectPlayableWord(
  words: string[],
  language: GameLanguage,
  maxAttempts: number,
): Promise<{ word: string; definition: DefinitionSummary | null }> {
  const used = new Set<number>()
  const attempts = Math.min(maxAttempts, words.length)
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const candidate = pickUniqueWord(words, used)
    if (!candidate) break
    try {
      const definition = await getDefinition(candidate, language)
      if (hasUsableDefinition(definition)) {
        return { word: candidate, definition }
      }
    } catch (error) {
      console.warn('Definition lookup failed for candidate', { candidate, error })
    }
  }

  const fallbackWord = pickWord(words)
  try {
    const fallbackDefinition = await getDefinition(fallbackWord, language)
    return {
      word: fallbackWord,
      definition: hasUsableDefinition(fallbackDefinition) ? fallbackDefinition : null,
    }
  } catch (error) {
    console.warn('Definition lookup failed for fallback word', { fallbackWord, error })
    return { word: fallbackWord, definition: null }
  }
}

function pickUniqueWord(words: string[], used: Set<number>) {
  if (!words.length || used.size === words.length) return null
  let index = Math.floor(Math.random() * words.length)
  while (used.has(index)) {
    index = Math.floor(Math.random() * words.length)
  }
  used.add(index)
  return words[index]
}

function hasUsableDefinition(definition: DefinitionSummary | null | undefined) {
  if (!definition) return false
  const short = definition.short?.trim()
  if (!short) return false
  return short.toLowerCase() !== 'definition unavailable'
}

function normalizeLetter(raw: string, language: GameLanguage) {
  const upper = raw.toUpperCase()
  return LETTERS[language].includes(upper) ? upper : null
}

function HangmanFigure({ mistakes }: { mistakes: number }) {
  return (
    <svg className="hangman-figure" viewBox="0 0 200 240" role="presentation" aria-hidden="true">
      <line x1="10" y1="230" x2="190" y2="230" />
      <line x1="60" y1="20" x2="60" y2="230" />
      <line x1="60" y1="20" x2="150" y2="20" />
      <line x1="150" y1="20" x2="150" y2="50" />
      {mistakes > 0 && <circle cx="150" cy="70" r="20" />}
      {mistakes > 1 && <line x1="150" y1="90" x2="150" y2="150" />}
      {mistakes > 2 && <line x1="150" y1="110" x2="125" y2="130" />}
      {mistakes > 3 && <line x1="150" y1="110" x2="175" y2="130" />}
      {mistakes > 4 && <line x1="150" y1="150" x2="130" y2="190" />}
      {mistakes > 5 && <line x1="150" y1="150" x2="170" y2="190" />}
    </svg>
  )
}
