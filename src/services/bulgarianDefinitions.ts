import type { DefinitionSummary } from '../features/game/types'

type RawEntry = {
  instruction?: string
  input?: string
  output?: string
}

type WordMap = Record<string, { meanings: string[]; raw: RawEntry[] }>

const BULGARIAN_DEFS_URL = new URL('../assets/dictionaries/alpaca_bulgarian_all_categories.json', import.meta.url).href
let loadPromise: Promise<WordMap> | null = null

function extractWordFromInput(input?: string): string | null {
  if (!input) return null
  // Expect formats like: "Дума: еякулация (еякула`ция)"
  const m = input.match(/Дума:\s*([^\s(\n]+)/u)
  if (m && m[1]) return m[1].toLowerCase()
  return null
}

function isMeaningInstruction(instr?: string) {
  if (!instr) return false
  const normalized = instr.toLowerCase()
  const meaningCandidates = [
    /значени/i,
    /какво (означава|е|е значението)/i,
    /какво означава/i,
    /информация/i,
    /повече информация/i,
    /общо инфо/i,
    /кажи ми повече/i,
    /какво е значението/i,
    /що е/i,
  ]
  return meaningCandidates.some((pattern) => pattern.test(normalized))
}

async function loadBulgarianMap(): Promise<WordMap> {
  if (loadPromise) return loadPromise
  console.info('[bulgarian-defs] Starting load from', BULGARIAN_DEFS_URL)
  const start = Date.now()
  loadPromise = fetch(BULGARIAN_DEFS_URL)
    .then((res) => {
      if (!res.ok) return {} as RawEntry[]
      return res.json() as Promise<RawEntry[]>
    })
    .then((entries) => {
      const map: WordMap = {}
      let processed = 0
      for (const item of entries || []) {
        processed += 1
        const word = extractWordFromInput(item.input)
        if (!word) continue
        if (!map[word]) map[word] = { meanings: [], raw: [] }
          map[word].raw.push(item)
          if (item.output) {
            // Heuristics: split the output into lines and pick candidate definition lines.
            const lines = String(item.output).split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
            const synonyms: string[] = []
            const prioritiseInstruction = isMeaningInstruction(item.instruction)
            let instructionCaptured = false
            for (const line of lines) {
              // skip explicit morphological or metadata lines
              if (/^(Дериват|Грешни форми|Разбита форма)/i.test(line)) continue

              // clean common prefixes and tokens
              let cleaned = line.replace(/Значение[:\s]*/i, '')
              cleaned = cleaned.replace(/\+\S+/g, '') // remove tokens like +мн.
              cleaned = cleaned.replace(/\`/g, '')
              cleaned = cleaned.replace(/\s{2,}/g, ' ').trim()
              if (!cleaned) continue

              if (prioritiseInstruction && !instructionCaptured) {
                map[word].meanings.unshift(cleaned)
                instructionCaptured = true
                continue
              }

              // classify line
              if (/^#\d+/i.test(line) || /^Знач/i.test(line)) {
                // high-priority meaning: put first
                map[word].meanings.unshift(cleaned)
                continue
              }

              // synonyms / equivalents lines - save for fallback
              if (/^(Еквивалент|Еквиваленти|Синоним|Синоними)/i.test(line)) {
                synonyms.push(cleaned)
                continue
              }

              // otherwise accept reasonably sized Cyrillic lines as possible meanings
              if (cleaned.length > 8 && cleaned.length < 240 && /[А-Яа-яЁё]/.test(cleaned)) {
                map[word].meanings.push(cleaned)
              }
            }
            // If we found no explicit meanings but have synonyms, use the first synonyms line as a fallback
            if (map[word].meanings.length === 0 && synonyms.length > 0) {
              map[word].meanings.push(synonyms[0])
            }
          }
      }
      const duration = Date.now() - start
      console.info('[bulgarian-defs] Loaded', processed, 'records, mapped words:', Object.keys(map).length, 'in', duration, 'ms')
      return map
    })
    .catch((err) => {
      console.warn('Failed loading Bulgarian definitions', err)
      return {}
    })

  return loadPromise
}

function shortFromMeanings(meanings: string[]): string | null {
  if (!meanings || meanings.length === 0) return null
  // pick the first meaning and collapse to the first sentence or line
  const text = meanings[0].trim()
  // split on line break first
  const firstLine = text.split('\n')[0]
  // then take up to first period (.) if present
  const dotIdx = firstLine.indexOf('.')
  if (dotIdx > 0) return firstLine.slice(0, dotIdx + 1)
  return firstLine
}

export async function getBulgarianDefinition(word: string): Promise<DefinitionSummary | null> {
  const lower = word.toLowerCase()
  try {
    console.info('[bulgarian-defs] lookup:', lower)
    const map = await loadBulgarianMap()
    const entry = map[lower]
    if (!entry) {
      console.info('[bulgarian-defs] miss:', lower)
      return null
    }
    const short = shortFromMeanings(entry.meanings) || null
    console.info('[bulgarian-defs] hit:', lower, 'meanings:', entry.meanings.length, 'rawCount:', entry.raw.length)
    if (entry.meanings && entry.meanings.length) {
      console.debug('[bulgarian-defs] sample meaning:', entry.meanings[0].slice(0, 240))
    } else if (entry.raw && entry.raw.length) {
      console.debug('[bulgarian-defs] sample raw output:', (entry.raw[0].output || '').slice(0, 240))
    }
    const summary: DefinitionSummary = {
      word: lower,
      short: short ?? 'Definition unavailable',
      source: 'local',
      savedAt: Date.now(),
      raw: entry.raw,
    }
    return summary
  } catch (err) {
    console.warn('Bulgarian definition lookup failed', err)
    return null
  }
}
