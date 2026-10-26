import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { assignPositions, positionBetween } from './positions'

// Display order is (position, id): equal positions are ordered by id
const before = (a: string, b: string, pos: Record<string, number>) => pos[a] < pos[b] || (pos[a] === pos[b] && a < b)
const increasing = (order: string[], pos: Record<string, number>) =>
  order.every((id, i) => i === 0 || before(order[i - 1], id, pos))

describe('positionBetween', () => {
  it('handles open ends', () => {
    expect(positionBetween(undefined, undefined)).toBe(0)
    expect(positionBetween(2, undefined)).toBe(3)
    expect(positionBetween(undefined, 2)).toBe(1)
    expect(positionBetween(0, 1)).toBe(0.5)
  })
})

describe('assignPositions', () => {
  it('numbers a fresh group 0, 1, 2', () => {
    expect(assignPositions(['a', 'b', 'c'], {})).toEqual({ a: 0, b: 1, c: 2 })
  })

  it('moving one item only changes that item', () => {
    const result = assignPositions(['c', 'a', 'b'], { a: 0, b: 1, c: 2 })
    expect(result.a).toBe(0)
    expect(result.b).toBe(1)
    expect(result.c).toBeLessThan(0)
  })

  it('inserting between two items takes the midpoint', () => {
    expect(assignPositions(['a', 'x', 'b'], { a: 0, b: 1 })).toEqual({ a: 0, x: 0.5, b: 1 })
  })

  it('is strictly increasing and stable when the order already matches', () => {
    fc.assert(fc.property(
      fc.uniqueArray(fc.string({ minLength: 1, maxLength: 3 }), { maxLength: 12 }),
      fc.array(fc.double({ min: -100, max: 100, noNaN: true }), { maxLength: 12 }),
      (ids, values) => {
        const known: Record<string, number> = {}
        ids.forEach((id, i) => { if (i < values.length) known[id] = values[i] })
        const result = assignPositions(ids, known)
        expect(increasing(ids, result)).toBe(true)
        const sorted = [...ids].sort((x, y) => (before(x, y, known) ? -1 : before(y, x, known) ? 1 : 0))
        if (ids.length === Object.keys(known).length) {
          expect(assignPositions(sorted, known)).toEqual(known)
        }
      },
    ))
  })

  it('keeps equal positions that are already in id order (concurrent adds)', () => {
    expect(assignPositions(['a', 'b', 'c'], { a: 0, b: 1, c: 1 })).toEqual({ a: 0, b: 1, c: 1 })
  })

  it('inserting between two equal positions renumbers the group', () => {
    const result = assignPositions(['a', 'x', 'b'], { a: 1, b: 1 })
    expect(increasing(['a', 'x', 'b'], result)).toBe(true)
  })

  it('renumbers when repeated inserts exhaust precision', () => {
    let known: Record<string, number> = { a: 0, b: 1 }
    let order = ['a', 'b']
    for (let i = 0; i < 80; i++) {
      order = [order[0], `n${i}`, ...order.slice(1)]
      known = assignPositions(order, known)
      expect(increasing(order, known)).toBe(true)
    }
  })
})
