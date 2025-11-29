import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GameLanguage } from '../game/types'
import { loadDictionary } from '../../services/dictionaryLoader'
import { getPlayerHighScore, recordPlayerHighScore } from '../leaderboard/storage'

const HANGMAN_GAME_ID = 'hangman'
const MAX_MISTAKES = 6
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

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setDictionary([])
    loadDictionary(language)
      .then((setResult) => {
        if (cancelled) return
        const curated = curateHangmanWords(Array.from(setResult), language)
        setDictionary(curated)
      })
      .catch(() => {
        if (!cancelled) {
          setDictionary(FALLBACK_WORDS[language])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })
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

  const beginRound = useCallback(() => {
    if (isLoading || dictionary.length === 0) return
    const nextWord = pickWord(dictionary)
    setSecretWord(nextWord)
    setCorrectLetters([])
    setWrongLetters([])
    setStatus('playing')
  }, [dictionary, isLoading])

  const stopRound = useCallback(() => {
    if (status === 'playing') {
      const confirmStop = window.confirm('Stop the current word? Your streak will reset.')
      if (!confirmStop) return
    }
    setStatus('idle')
    setSecretWord('')
    setCorrectLetters([])
    setWrongLetters([])
    setStreak(0)
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
            <select value={language} onChange={(event) => setLanguage(event.target.value as GameLanguage)} disabled={status === 'playing'}>
              <option value="english">English</option>
              <option value="bulgarian">Български</option>
            </select>
          </label>
          <button type="button" className="action success" onClick={beginRound} disabled={isLoading || status === 'playing'}>
            {isLoading ? 'Loading…' : secretWord ? 'New word' : 'Start'}
          </button>
          <button type="button" className="action" onClick={restartRound} disabled={status !== 'playing'}>
            Restart
          </button>
          <button type="button" className="action danger" onClick={stopRound} disabled={status === 'idle'}>
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
          <span>{maskedWord}</span>
          {status === 'won' && <p className="status-message success">Nice! Keep the streak going.</p>}
          {status === 'lost' && secretWord && (
            <p className="status-message danger">
              Out of lives. The word was <strong>{secretWord}</strong>.
            </p>
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
              disabled={status !== 'playing' || guessed}
            >
              {letter}
            </button>
          )
        })}
      </div>
    </div>
  )
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
