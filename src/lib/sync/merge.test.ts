import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { mergeRemote, nextSyncMeta, recordDeletions } from './merge'
import { createMemoryRemote } from './memoryRemote'
import { hashList } from './hash'
import { emptySyncMeta } from './syncMeta'
import type { List } from '../../types'
import type { RemoteListDoc, SyncMeta } from './types'

const mk = (id: string, name = id, updatedAt = 1): List => ({
  id, name, type: 'shopping', currency: 'BRL', taxPercentage: 0, items: [], sections: [], archived: false, updatedAt,
})
const active = (l: List, syncedAt = 100): RemoteListDoc => ({ id: l.id, updatedAt: l.updatedAt ?? 0, deleted: false, syncedAt, list: l })
const tomb = (id: string, updatedAt: number, syncedAt = 100): RemoteListDoc => ({ id, updatedAt, deleted: true, syncedAt })
const metaWith = (lists: List[], extra: Partial<SyncMeta> = {}): SyncMeta => ({
  ...emptySyncMeta('u1'),
  synced: Object.fromEntries(lists.map(l => [l.id, hashList(l)])),
  ...extra,
})
const NOW = 1_000

describe('mergeRemote', () => {
  it('adds a remote list that never existed locally', () => {
    const r = mergeRemote([], [active(mk('a'))], emptySyncMeta('u1'), NOW)
    expect(r.lists.map(l => l.id)).toEqual(['a'])
    expect(r.toPush).toEqual([])
  })

  it('ignores a remote tombstone for a list never seen locally', () => {
    const r = mergeRemote([], [tomb('a', 5)], emptySyncMeta('u1'), NOW)
    expect(r.lists).toEqual([])
    expect(r.tombstones).toEqual([])
  })

  it('applies remote over a clean local list', () => {
    const local = mk('a', 'old', 1)
    const r = mergeRemote([local], [active(mk('a', 'new', 0))], metaWith([local]), NOW)
    expect(r.lists[0].name).toBe('new')
    expect(r.toPush).toEqual([])
  })

  it('dirty local newer than remote wins and is pushed', () => {
    const synced = mk('a', 'base', 1)
    const local = mk('a', 'local', 30)
    const r = mergeRemote([local], [active(mk('a', 'remote', 20))], metaWith([synced]), NOW)
    expect(r.lists[0].name).toBe('local')
    expect(r.toPush.map(l => l.name)).toEqual(['local'])
  })

  it('dirty local older than remote loses', () => {
    const synced = mk('a', 'base', 1)
    const r = mergeRemote([mk('a', 'local', 10)], [active(mk('a', 'remote', 20))], metaWith([synced]), NOW)
    expect(r.lists[0].name).toBe('remote')
    expect(r.toPush).toEqual([])
  })

  it('treats a legacy local list without updatedAt as oldest', () => {
    const legacy = { ...mk('a', 'legacy'), updatedAt: undefined }
    const r = mergeRemote([legacy], [active(mk('a', 'remote', 1))], emptySyncMeta('u1'), NOW)
    expect(r.lists[0].name).toBe('remote')
  })

  it('remote tombstone removes a clean local list and settles it', () => {
    const local = mk('a')
    const r = mergeRemote([local], [tomb('a', 5)], metaWith([local]), NOW)
    expect(r.lists).toEqual([])
    expect(r.tombstones).toEqual([])
    expect(r.settledDeletes).toEqual(['a'])
  })

  it('dirty local edited after the remote tombstone survives and is pushed', () => {
    const synced = mk('a', 'base', 1)
    const local = mk('a', 'edited', 50)
    const r = mergeRemote([local], [tomb('a', 40)], metaWith([synced]), NOW)
    expect(r.lists.map(l => l.name)).toEqual(['edited'])
    expect(r.toPush.map(l => l.id)).toEqual(['a'])
  })

  it('local deletion is pushed as tombstone with the recorded time', () => {
    const synced = mk('a')
    const r = mergeRemote([], [], metaWith([synced], { deleted: { a: 300 } }), NOW)
    expect(r.tombstones).toEqual([{ id: 'a', deletedAt: 300 }])
    expect(r.settledDeletes).toEqual(['a'])
  })

  it('remote edit newer than the local deletion restores the list', () => {
    const synced = mk('a')
    const r = mergeRemote([], [active(mk('a', 'remote', 500))], metaWith([synced], { deleted: { a: 300 } }), NOW)
    expect(r.lists.map(l => l.name)).toEqual(['remote'])
    expect(r.tombstones).toEqual([])
    expect(r.settledDeletes).toEqual(['a'])
  })

  it('remote edit older than the local deletion stays deleted', () => {
    const synced = mk('a')
    const r = mergeRemote([], [active(mk('a', 'remote', 200))], metaWith([synced], { deleted: { a: 300 } }), NOW)
    expect(r.lists).toEqual([])
    expect(r.tombstones).toEqual([{ id: 'a', deletedAt: 300 }])
  })

  it('pushes never-synced local lists and keeps local order with remote additions last', () => {
    const r = mergeRemote([mk('x'), mk('y')], [active(mk('z'))], emptySyncMeta('u1'), NOW)
    expect(r.lists.map(l => l.id)).toEqual(['x', 'y', 'z'])
    expect(r.toPush.map(l => l.id)).toEqual(['x', 'y'])
  })
})

describe('nextSyncMeta', () => {
  it('records hashes of the merged lists, advances the cursor and drops settled deletions', () => {
    const current: SyncMeta = { ...emptySyncMeta('u1'), lastPulledAt: 50, deleted: { a: 1, b: 2 } }
    const result = { lists: [mk('c')], toPush: [], tombstones: [{ id: 'a', deletedAt: 1 }], settledDeletes: ['a'] }
    const next = nextSyncMeta(current, result, [tomb('x', 1, 70), active(mk('c'), 60)])
    expect(next.synced).toEqual({ c: hashList(mk('c')) })
    expect(next.lastPulledAt).toBe(70)
    expect(next.deleted).toEqual({ b: 2 })
  })

  it('keeps the cursor when nothing was pulled', () => {
    const next = nextSyncMeta({ ...emptySyncMeta('u1'), lastPulledAt: 50 }, { lists: [], toPush: [], tombstones: [], settledDeletes: [] }, [])
    expect(next.lastPulledAt).toBe(50)
  })
})

describe('recordDeletions', () => {
  it('records synced lists that disappeared, once', () => {
    const meta = metaWith([mk('a'), mk('b')])
    const once = recordDeletions(meta, [mk('b')], 10)
    expect(once.deleted).toEqual({ a: 10 })
    expect(recordDeletions(once, [mk('b')], 20)).toBe(once)
  })

  it('returns the same object when nothing changed', () => {
    const meta = metaWith([mk('a')])
    expect(recordDeletions(meta, [mk('a')], 10)).toBe(meta)
  })
})

// --- Property tests: two simulated devices sharing one memory remote ---

interface Device { lists: List[]; meta: SyncMeta }

const syncDevice = async (d: Device, remote: ReturnType<typeof createMemoryRemote>, now: number): Promise<Device> => {
  const meta = recordDeletions(d.meta, d.lists, now)
  const pulled = await remote.pullSince('u1', meta.lastPulledAt)
  const result = mergeRemote(d.lists, pulled, meta, now)
  await remote.push('u1', result.toPush, result.tombstones)
  return { lists: result.lists, meta: nextSyncMeta(meta, result, pulled) }
}

const contentById = (lists: List[]) =>
  Object.fromEntries(lists.map(l => [l.id, hashList(l)]))

type Op = { kind: 'upsert'; id: string; name: string } | { kind: 'delete'; id: string }
const opArb: fc.Arbitrary<Op> = fc.oneof(
  fc.record({ kind: fc.constant('upsert' as const), id: fc.constantFrom('a', 'b', 'c'), name: fc.string({ maxLength: 4 }) }),
  fc.record({ kind: fc.constant('delete' as const), id: fc.constantFrom('a', 'b', 'c') }),
)

const applyOps = (lists: List[], ops: Op[], at: number): List[] =>
  ops.reduce((acc, op, i) => {
    if (op.kind === 'delete') return acc.filter(l => l.id !== op.id)
    const updated = mk(op.id, op.name, at + i)
    return acc.some(l => l.id === op.id) ? acc.map(l => l.id === op.id ? updated : l) : [...acc, updated]
  }, lists)

describe('sync properties', () => {
  it('converges: after A syncs then B syncs then A syncs, both have the same content', async () => {
    await fc.assert(fc.asyncProperty(fc.array(opArb, { maxLength: 6 }), fc.array(opArb, { maxLength: 6 }), async (opsA, opsB) => {
      const remote = createMemoryRemote()
      let a: Device = { lists: applyOps([], opsA, 10), meta: emptySyncMeta('u1') }
      let b: Device = { lists: applyOps([], opsB, 20), meta: emptySyncMeta('u1') }
      a = await syncDevice(a, remote, 100)
      b = await syncDevice(b, remote, 200)
      a = await syncDevice(a, remote, 300)
      expect(contentById(a.lists)).toEqual(contentById(b.lists))
    }))
  })

  it('never loses a list that exists only on one side', async () => {
    await fc.assert(fc.asyncProperty(fc.array(opArb, { maxLength: 6 }), async ops => {
      const remote = createMemoryRemote()
      const lists = applyOps([], ops, 10)
      const a = await syncDevice({ lists, meta: emptySyncMeta('u1') }, remote, 100)
      const b = await syncDevice({ lists: [], meta: emptySyncMeta('u1') }, remote, 200)
      expect(contentById(b.lists)).toEqual(contentById(a.lists))
      expect(contentById(a.lists)).toEqual(contentById(lists))
    }))
  })

  it('is idempotent: a second sync with no changes pushes nothing', async () => {
    await fc.assert(fc.asyncProperty(fc.array(opArb, { maxLength: 6 }), async ops => {
      const remote = createMemoryRemote()
      const a = await syncDevice({ lists: applyOps([], ops, 10), meta: emptySyncMeta('u1') }, remote, 100)
      const pulled = await remote.pullSince('u1', a.meta.lastPulledAt)
      const again = mergeRemote(a.lists, pulled, a.meta, 200)
      expect(again.toPush).toEqual([])
      expect(again.tombstones).toEqual([])
      expect(contentById(again.lists)).toEqual(contentById(a.lists))
    }))
  })
})
