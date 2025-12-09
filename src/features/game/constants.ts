import type { GameLanguage } from './types'

export const GRID_SIZE = 10
export const TIMER_OPTIONS_SECONDS = Array.from({ length: 9 }, (_, i) => 60 + i * 30) // 60..300

export const DEFAULT_TIMER_SECONDS = 120

export const ENGLISH_WEIGHTS: Array<[string, number]> = [
  ['E', 12.7],
  ['T', 9.1],
  ['A', 8.2],
  ['O', 7.5],
  ['I', 7.0],
  ['N', 6.7],
  ['S', 6.3],
  ['H', 6.1],
  ['R', 6.0],
  ['D', 4.3],
  ['L', 4.0],
  ['C', 2.8],
  ['U', 2.8],
  ['M', 2.4],
  ['W', 2.4],
  ['F', 2.2],
  ['G', 2.0],
  ['Y', 2.0],
  ['P', 1.9],
  ['B', 1.5],
  ['V', 1.0],
  ['K', 0.8],
  ['J', 0.15],
  ['X', 0.15],
  ['Q', 0.1],
  ['Z', 0.07],
]

export const ENGLISH_EASY_WEIGHTS: Array<[string, number]> = [
  ['E', 11.46],
  ['T', 9.38],  // Significantly higher than standard English (usually ~9.1)
  ['O', 7.29],
  ['A', 6.25],  // Lower than standard English (~8.2) to prevent vowel flooding
  ['I', 6.25],
  ['N', 6.25],
  ['S', 6.25],
  ['H', 5.21],  // Boosted to help form "TH", "SH", "CH"
  ['R', 5.21],
  ['L', 4.17],
  ['D', 3.12],
  ['U', 3.12],
  ['W', 3.12],
  ['M', 2.08],
  ['B', 2.08],
  ['C', 2.08],
  ['F', 2.08],
  ['G', 2.08],
  ['P', 2.08],
  ['V', 2.08],
  ['Y', 3.12],  // Boosted as a semi-vowel
  ['J', 1.04],
  ['K', 1.04],
  ['Q', 1.04],  // See logic note below regarding "Qu"
  ['X', 1.04],
  ['Z', 1.04],
];

// Softer distribution for casual boards: extra vowels/consonants that form common digraphs, slightly heavier rare letters.
export const GRID_OPTIMIZED_WEIGHTS: Array<[string, number]> = [
  ['E', 11.0],
  ['A', 10.0],
  ['I', 9.0],
  ['O', 8.5],
  ['N', 7.0],
  ['R', 6.5],
  ['T', 6.0],
  ['L', 5.0],
  ['S', 5.0],
  ['C', 4.2],
  ['D', 4.0],
  ['H', 4.0],
  ['M', 3.2],
  ['P', 3.0],
  ['G', 2.6],
  ['B', 2.0],
  ['F', 2.0],
  ['Y', 2.0],
  ['U', 2.0],
  ['W', 1.6],
  ['K', 1.2],
  ['V', 1.1],
  ['X', 0.4],
  ['J', 0.4],
  ['Q', 0.3],
  ['Z', 0.3],
]

export const BULGARIAN_WEIGHTS: Array<[string, number]> = [
  ['А', 8.0],
  ['Б', 1.5],
  ['В', 4.5],
  ['Г', 2.0],
  ['Д', 3.6],
  ['Е', 7.5],
  ['Ж', 1.0],
  ['З', 1.8],
  ['И', 7.0],
  ['Й', 0.9],
  ['К', 3.5],
  ['Л', 3.7],
  ['М', 3.0],
  ['Н', 6.5],
  ['О', 9.0],
  ['П', 3.2],
  ['Р', 4.8],
  ['С', 4.7],
  ['Т', 6.8],
  ['У', 2.1],
  ['Ф', 0.3],
  ['Х', 0.8],
  ['Ц', 1.2],
  ['Ч', 1.7],
  ['Ш', 1.0],
  ['Щ', 0.5],
  ['Ъ', 2.3],
  ['Ь', 0.2],
  ['Ю', 0.4],
  ['Я', 2.0],
]

export function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function getWeights(language: GameLanguage) {
  return language === 'english' ? ENGLISH_EASY_WEIGHTS : BULGARIAN_WEIGHTS
}
