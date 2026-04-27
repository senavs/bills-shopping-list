import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import { ListsProvider, useLists } from './ListsContext'
import type { List } from '../types'

// Seed localStorage with a list containing 3 items before each test
const LIST_ID = 'list-1'
const makeList = (): List => ({
  id: LIST_ID,
  name: 'Test',
  type: 'shopping',
  currency: 'USD',
  taxPercentage: 0,
  archived: false,
  items: [
    { id: 'a', name: 'Apple',  quantity: 1, unitPrice: 1, selected: false, includeInTax: false },
    { id: 'b', name: 'Banana', quantity: 1, unitPrice: 2, selected: false, includeInTax: false },
    { id: 'c', name: 'Cherry', quantity: 1, unitPrice: 3, selected: true,  includeInTax: true  },
  ],
})

beforeEach(() => {
  localStorage.setItem('app', JSON.stringify({ lists: [makeList()] }))
})

// Helper: mount provider and capture context value
function setup() {
  let ctx!: ReturnType<typeof useLists>
  const Capture = () => { ctx = useLists(); return null }
  render(<ListsProvider><Capture /></ListsProvider>)
  return () => ctx
}

describe('reorderItem', () => {
  it('moves an item from first to last', () => {
    const getCtx = setup()
    act(() => getCtx().reorderItem(LIST_ID, 0, 2))
    const items = getCtx().lists.find(l => l.id === LIST_ID)!.items
    expect(items.map(i => i.id)).toEqual(['b', 'c', 'a'])
  })

  it('moves an item from last to first', () => {
    const getCtx = setup()
    act(() => getCtx().reorderItem(LIST_ID, 2, 0))
    const items = getCtx().lists.find(l => l.id === LIST_ID)!.items
    expect(items.map(i => i.id)).toEqual(['c', 'a', 'b'])
  })

  it('moves an item one step down (middle)', () => {
    const getCtx = setup()
    act(() => getCtx().reorderItem(LIST_ID, 0, 1))
    const items = getCtx().lists.find(l => l.id === LIST_ID)!.items
    expect(items.map(i => i.id)).toEqual(['b', 'a', 'c'])
  })

  it('moves an item one step up (middle)', () => {
    const getCtx = setup()
    act(() => getCtx().reorderItem(LIST_ID, 2, 1))
    const items = getCtx().lists.find(l => l.id === LIST_ID)!.items
    expect(items.map(i => i.id)).toEqual(['a', 'c', 'b'])
  })

  it('preserves all item properties after reorder', () => {
    const getCtx = setup()
    act(() => getCtx().reorderItem(LIST_ID, 2, 0))
    const cherry = getCtx().lists.find(l => l.id === LIST_ID)!.items[0]
    expect(cherry).toMatchObject({ id: 'c', selected: true, includeInTax: true, unitPrice: 3 })
  })

  it('does not affect other lists', () => {
    const otherList: List = { ...makeList(), id: 'other', name: 'Other' }
    localStorage.setItem('app', JSON.stringify({ lists: [makeList(), otherList] }))
    const getCtx = setup()
    act(() => getCtx().reorderItem(LIST_ID, 0, 2))
    const other = getCtx().lists.find(l => l.id === 'other')!
    expect(other.items.map(i => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('persists new order to localStorage', () => {
    const getCtx = setup()
    act(() => getCtx().reorderItem(LIST_ID, 0, 2))
    const saved = JSON.parse(localStorage.getItem('app')!)
    const ids = saved.lists.find((l: List) => l.id === LIST_ID).items.map((i: { id: string }) => i.id)
    expect(ids).toEqual(['b', 'c', 'a'])
  })
})
