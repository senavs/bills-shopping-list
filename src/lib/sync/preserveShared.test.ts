import { describe, it, expect } from 'vitest'
import { withSharedPreserved } from './preserveShared'
import type { List } from '../../types'

const mk = (id: string, shared = false): List => ({
  id, name: id, type: 'shopping', currency: 'BRL', taxPercentage: 0, items: [], sections: [], archived: false,
  ...(shared ? { shared: { ownerUid: 'u1', inviteToken: 't' } } : {}),
})

describe('withSharedPreserved', () => {
  it('keeps shared lists at their index and fills the rest with personal lists in order', () => {
    const S = mk('S', true)
    const result = withSharedPreserved([mk('p1'), S, mk('p2')], [mk('p2'), mk('p1'), mk('p3')])
    expect(result.map(l => l.id)).toEqual(['p2', 'S', 'p1', 'p3'])
    expect(result[1]).toBe(S)
  })

  it('keeps trailing shared lists when there are fewer personal lists', () => {
    const result = withSharedPreserved([mk('p1'), mk('p2'), mk('S', true)], [mk('p1')])
    expect(result.map(l => l.id)).toEqual(['p1', 'S'])
  })
})
