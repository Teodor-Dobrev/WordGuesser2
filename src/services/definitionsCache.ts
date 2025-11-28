import type { DefinitionSummary, GameLanguage } from '../features/game/types'
import { getBulgarianDefinition } from './bulgarianDefinitions'

const STORAGE_KEY = 'wordguesser:definitions'
const memoryCache = new Map<string, DefinitionSummary>()
const DEFINITIONS_DEBUG =
  (typeof window !== 'undefined' && window.localStorage.getItem('wordguesser:log') === '1') ||
  import.meta.env.DEV

interface DictionaryApiPayload {
  word: string
  meanings?: Array<{
    partOfSpeech?: string
    definitions?: Array<{
      definition?: string
      example?: string
    }>
  }>
}

type LocalMeaningTuple = [string?, string?, unknown?, Array<string>?]

interface LocalDefinitionEntry {
  MEANINGS?: LocalMeaningTuple[]
  SYNONYMS?: string[]
  ANTONYMS?: string[]
}

type LocalDefinitionStore = Record<string, LocalDefinitionEntry>

const LOCAL_DEFINITIONS_URL = new URL('../assets/dictionaries/english_definitions.json', import.meta.url).href
let localDefinitionPromise: Promise<LocalDefinitionStore> | null = null

function readStore(): Record<string, DefinitionSummary> {
  if (typeof window === 'undefined') return {}
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)
    if (!existing) return {}
    return JSON.parse(existing)
  } catch (error) {
    console.warn('Unable to parse definition cache', error)
    return {}
  }
}

function writeStore(store: Record<string, DefinitionSummary>) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch (error) {
    console.warn('Unable to persist definition cache', error)
  }
}

function extractShort(entry: DictionaryApiPayload[] | DictionaryApiPayload): string {
  if (!Array.isArray(entry)) return 'Definition unavailable'
  for (const item of entry) {
    const meanings = item.meanings ?? []
    for (const meaning of meanings) {
      const definitions = meaning.definitions ?? []
      if (definitions.length) {
        const { definition, example } = definitions[0]
        const exampleText = example ? ` Example: ${example}` : ''
        // Omit the part-of-speech label from the short display
        return `${definition ?? ''}${exampleText}`.trim()
      }
    }
  }
  return 'Definition unavailable'
}

async function loadLocalDefinitions(): Promise<LocalDefinitionStore> {
  if (localDefinitionPromise) return localDefinitionPromise
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    localDefinitionPromise = Promise.resolve({})
    return localDefinitionPromise
  }

  localDefinitionPromise = fetch(LOCAL_DEFINITIONS_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Local definitions unavailable (HTTP ${response.status})`)
      }
      return response.json() as Promise<Record<string, LocalDefinitionEntry>>
    })
    .then((raw) => normalizeLocalDefinitions(raw))
    .catch((error) => {
      console.warn('Unable to load local definitions', error)
      definitionLog('local-load:error', { message: error instanceof Error ? error.message : String(error) })
      return {}
    })

  return localDefinitionPromise
}

async function lookupLocalDefinition(word: string): Promise<DefinitionSummary | null> {
  try {
    const dictionary = await loadLocalDefinitions()
    const entry = dictionary[word]
    if (!entry) return null
    const short = buildLocalShort(entry)
    if (!short) return null
    return {
      word,
      short,
      source: 'local',
      savedAt: Date.now(),
      raw: entry,
    }
  } catch (error) {
    console.warn('Local definition lookup failed', error)
    definitionLog('local:error', { word, message: error instanceof Error ? error.message : String(error) })
    return null
  }
}

function normalizeLocalDefinitions(raw: Record<string, LocalDefinitionEntry> | null | undefined): LocalDefinitionStore {
  if (!raw) return {}
  const normalized: LocalDefinitionStore = {}
  for (const [key, value] of Object.entries(raw)) {
    normalized[key.toLowerCase()] = value
  }
  definitionLog('local-load:success', { entries: Object.keys(normalized).length })
  return normalized
}

function buildLocalShort(entry: LocalDefinitionEntry): string | null {
  const tuple = entry.MEANINGS?.find(Boolean)
  if (!tuple) return null
  const [, definition, , examples] = tuple
  if (!definition) return null
  const example = Array.isArray(examples) && examples.length ? examples[0] : ''
  const exampleText = example ? ` Example: ${example}` : ''
  // Omit the part-of-speech label when building the short summary for display
  return `${definition}`.trim() + exampleText
}

export async function getDefinition(word: string, language: GameLanguage) {
  const lower = word.toLowerCase()
  // Bulgarian lookups are handled later in the flow so we can persist results

  if (language !== 'english' && language !== 'bulgarian') {
    return null
  }

  if (memoryCache.has(lower)) {
    definitionLog('cache-hit', { word: lower })
    return memoryCache.get(lower) ?? null
  }

  const store = readStore()
  if (store[lower]) {
    memoryCache.set(lower, store[lower])
    definitionLog('storage-hit', { word: lower })
    return store[lower]
  }

  const persist = (summary: DefinitionSummary) => {
    store[lower] = summary
    memoryCache.set(lower, summary)
    writeStore(store)
  }

  if (language === 'bulgarian') {
    definitionLog('local:bg:lookup', { word: lower })
    try {
      const bg = await getBulgarianDefinition(lower)
      if (bg) {
        definitionLog('local:bg:hit', { word: lower })
        persist(bg)
        return bg
      }
      definitionLog('local:bg:miss', { word: lower })
      return null
    } catch (err) {
      console.warn('Bulgarian lookup failed in cache flow', err)
      definitionLog('local:bg:error', { word: lower, message: err instanceof Error ? err.message : String(err) })
      return null
    }
  }

  const localSummary = await lookupLocalDefinition(lower)
  if (localSummary) {
    definitionLog('local:hit', { word: lower })
    persist(localSummary)
    return localSummary
  }

  try {
    definitionLog('request:start', { word: lower })
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${lower}`, {
      mode: 'cors',
      headers: {
        Accept: 'application/json',
      },
    })
    if (!response.ok) {
      definitionLog('request:failed', { word: lower, status: response.status })
      const fallback = buildFallbackSummary(lower)
      persist(fallback)
      return fallback
    }
    const payload = (await response.json()) as DictionaryApiPayload[]
    const summary: DefinitionSummary = {
      word: lower,
      short: extractShort(payload),
      source: 'api',
      savedAt: Date.now(),
      raw: payload,
    }
    persist(summary)
    definitionLog('request:success', { word: lower })
    return summary
  } catch (error) {
    console.warn('Definition lookup failed', error)
    definitionLog('request:error', { word: lower, message: error instanceof Error ? error.message : String(error) })
    const fallback = buildFallbackSummary(lower)
    persist(fallback)
    return fallback
  }
}

function buildFallbackSummary(word: string): DefinitionSummary {
  return {
    word,
    // Always show the generic unavailable message; avoid exposing HTTP status or error text
    short: 'Definition unavailable',
    source: 'fallback',
    savedAt: Date.now(),
  }
}

function definitionLog(message: string, payload: Record<string, unknown>) {
  if (!DEFINITIONS_DEBUG) return
  console.info(`[definitions] ${message}`, payload)
}
