import type { Item } from '../types'

/** Up to two letters for an avatar: first + last word ("Ana Maria Souza" → "AS"). */
export const initials = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const first = Array.from(words[0])[0]
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : ''
  return (first + last).toLocaleUpperCase()
}

/** How many items each person is assigned to, by person id. */
export const assignedItemCounts = (items: Item[]): Record<string, number> => {
  const counts: Record<string, number> = {}
  for (const item of items) {
    for (const id of item.assignedTo || []) counts[id] = (counts[id] ?? 0) + 1
  }
  return counts
}
