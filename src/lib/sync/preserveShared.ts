import type { List } from '../../types'

/**
 * Personal sync replaces the personal lists only: shared lists of `prev` keep
 * their index, the remaining slots take `personal` in order, extras go last.
 */
export const withSharedPreserved = (prev: List[], personal: List[]): List[] => {
  const rest = [...personal]
  const result: List[] = []
  for (const l of prev) {
    if (l.shared) result.push(l)
    else if (rest.length > 0) result.push(rest.shift()!)
  }
  return [...result, ...rest]
}
