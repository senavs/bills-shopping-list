// Fractional positions: reordering rewrites only the moved entries, so two
// members reordering different items don't overwrite each other.

const MIN_GAP = 1e-9

export const positionBetween = (before: number | undefined, after: number | undefined): number => {
  if (before === undefined && after === undefined) return 0
  if (after === undefined) return before! + 1
  if (before === undefined) return after - 1
  return (before + after) / 2
}

type Key = readonly [position: number, id: string]

// Display order is (position, id): equal positions from concurrent adds are a
// valid, stable order and must not be rewritten
const less = (a: Key, b: Key) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1])

/** Indexes (into `values`) of a longest strictly increasing subsequence. */
const longestIncreasing = (values: Key[]): Set<number> => {
  const tails: number[] = [] // index of the smallest tail for each length
  const prev = new Array<number>(values.length).fill(-1)
  values.forEach((v, i) => {
    let lo = 0
    let hi = tails.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (less(values[tails[mid]], v)) lo = mid + 1
      else hi = mid
    }
    if (lo > 0) prev[i] = tails[lo - 1]
    tails[lo] = i
  })
  const keep = new Set<number>()
  for (let i = tails.length ? tails[tails.length - 1] : -1; i !== -1; i = prev[i]) keep.add(i)
  return keep
}

/**
 * Positions for `order`, increasing in (position, id). Entries whose known
 * positions already form the longest increasing run keep them; the others are
 * spread between their kept neighbours. Renumbers 0..n-1 when there is no room.
 */
export const assignPositions = (order: string[], known: Record<string, number>): Record<string, number> => {
  const knownIdx = order.map((id, i) => [id, i] as const).filter(([id]) => known[id] !== undefined)
  const kept = new Set<number>()
  for (const k of longestIncreasing(knownIdx.map(([id]) => [known[id], id] as const))) kept.add(knownIdx[k][1])

  const result: Record<string, number> = {}
  let i = 0
  let prev: number | undefined
  while (i < order.length) {
    if (kept.has(i)) {
      prev = result[order[i]] = known[order[i]]
      i++
      continue
    }
    let end = i
    while (end < order.length && !kept.has(end)) end++
    const next = end < order.length ? known[order[end]] : undefined
    const count = end - i
    for (let j = 1; j <= count; j++) {
      const id = order[i + j - 1]
      if (prev !== undefined && next !== undefined) result[id] = prev + ((next - prev) * j) / (count + 1)
      else if (next !== undefined) result[id] = next - (count + 1 - j)
      else result[id] = (prev ?? -1) + j
    }
    const tooTight = prev !== undefined && next !== undefined && (next - prev) / (count + 1) < MIN_GAP
    if (tooTight) return Object.fromEntries(order.map((id, n) => [id, n]))
    prev = result[order[end - 1]]
    i = end
  }
  return result
}
