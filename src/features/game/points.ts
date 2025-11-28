export function pointsForLength(length: number) {
  if (length <= 1) return 0
  if (length === 2) return 1
  if (length === 3) return 2
  if (length === 4) return 4
  if (length === 5) return 8
  if (length === 6) return 12
  if (length === 7) return 16
  if (length === 8) return 20
  return 20 + (length - 8) * 5
}
