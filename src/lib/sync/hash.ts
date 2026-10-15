import type { List } from '../../types'

// Key-sorted serialization that drops undefined, so a list hashes the same
// before and after a Firestore round-trip (which reorders keys and drops undefined)
const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj).filter(k => obj[k] !== undefined).sort()
    return `{${keys.map(k => `${JSON.stringify(k)}:${stable(obj[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

/** Content hash (FNV-1a) of a list, ignoring updatedAt. */
export const hashList = (list: List): string => {
  const content: Record<string, unknown> = { ...list }
  delete content.updatedAt
  const s = stable(content)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `${(h >>> 0).toString(16)}-${s.length}`
}
