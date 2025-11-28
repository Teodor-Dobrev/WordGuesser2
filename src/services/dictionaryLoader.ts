import type { GameLanguage } from '../features/game/types'

type DictionaryModule = { default: string }

const EMBEDDED_IMPORTS: Record<GameLanguage, () => Promise<DictionaryModule>> = {
  english: () => import('../assets/dictionaries/english.txt?raw'),
  bulgarian: () => import('../assets/dictionaries/bulgarian.txt?raw'),
}

const FALLBACKS: Record<GameLanguage, string[]> = {
  english: ['APPLE', 'HOUSE', 'PHONE', 'MOON', 'TRACK', 'BRIGHT'],
  bulgarian: ['ДУМА', 'МОРЕ', 'РЕКА', 'РАЗУМ', 'ПИСМО'],
}

const dictionaryCache = new Map<GameLanguage, Set<string>>()
const DICTIONARY_DEBUG = typeof window !== 'undefined' ? window.localStorage.getItem('wordguesser:log') === '1' || import.meta.env.DEV : false

export async function loadDictionary(language: GameLanguage) {
  dictionaryLog('loadDictionary:start', { language })
  if (dictionaryCache.has(language)) {
    const cached = dictionaryCache.get(language)!
    dictionaryLog('loadDictionary:cache-hit', { language, count: cached.size })
    return cached
  }

  const loader = EMBEDDED_IMPORTS[language]
  if (!loader) {
    const fallbackSet = new Set(FALLBACKS[language])
    dictionaryCache.set(language, fallbackSet)
    dictionaryLog('loadDictionary:fallback-only', { language, count: fallbackSet.size })
    return fallbackSet
  }

  try {
    dictionaryLog('embedded:import', { language })
    const module = await loader()
    const parsed = parseWords(module.default ?? '')
    dictionaryLog('embedded:parsed', { language, count: parsed.length })
    const result = new Set(parsed.length ? parsed : FALLBACKS[language])
    dictionaryCache.set(language, result)
    dictionaryLog('loadDictionary:ready', { language, count: result.size })
    return result
  } catch (error) {
    console.warn('Embedded dictionary load failed', error)
    dictionaryLog('embedded:error', { language, error: error instanceof Error ? error.message : String(error) })
    const fallback = new Set(FALLBACKS[language])
    dictionaryCache.set(language, fallback)
    return fallback
  }
}

function parseWords(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 1)
    .map((line) => line.toUpperCase())
}

function dictionaryLog(message: string, payload: Record<string, unknown>) {
  if (!DICTIONARY_DEBUG) return
  console.info(`[dictionary] ${message}`, payload)
}
