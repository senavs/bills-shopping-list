import { describe, it, expect, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { ListsProvider, useLists } from './ListsContext'
import type { List } from '../types'

const LIST_ID = 'list-1'
const makeList = (): List => ({
  id: LIST_ID,
  name: 'Test',
  type: 'shopping',
  currency: 'USD',
  taxPercentage: 0,
  archived: false,
  sections: [],
  items: [
    { id: 'a', name: 'Apple',  quantity: 1, unitPrice: 1, selected: false, includeInTax: false },
    { id: 'b', name: 'Banana', quantity: 1, unitPrice: 2, selected: false, includeInTax: false },
    { id: 'c', name: 'Cherry', quantity: 1, unitPrice: 3, selected: true,  includeInTax: true  },
  ],
})

beforeEach(() => {
  localStorage.setItem('app', JSON.stringify({ lists: [makeList()] }))
})

function setup() {
  let ctx!: ReturnType<typeof useLists>
  const Capture = () => { ctx = useLists(); return null }
  render(<ListsProvider><Capture /></ListsProvider>)
  return () => ctx
}

const getList = (ctx: ReturnType<typeof useLists>) => ctx.lists.find(l => l.id === LIST_ID)!

describe('reorderItem', () => {
  it('moves an item from first to last', () => {
    const getCtx = setup()
    act(() => getCtx().reorderItem(LIST_ID, 0, 2))
    expect(getList(getCtx()).items.map(i => i.id)).toEqual(['b', 'c', 'a'])
  })

  it('moves an item from last to first', () => {
    const getCtx = setup()
    act(() => getCtx().reorderItem(LIST_ID, 2, 0))
    expect(getList(getCtx()).items.map(i => i.id)).toEqual(['c', 'a', 'b'])
  })

  it('moves an item one step down (middle)', () => {
    const getCtx = setup()
    act(() => getCtx().reorderItem(LIST_ID, 0, 1))
    expect(getList(getCtx()).items.map(i => i.id)).toEqual(['b', 'a', 'c'])
  })

  it('moves an item one step up (middle)', () => {
    const getCtx = setup()
    act(() => getCtx().reorderItem(LIST_ID, 2, 1))
    expect(getList(getCtx()).items.map(i => i.id)).toEqual(['a', 'c', 'b'])
  })

  it('preserves all item properties after reorder', () => {
    const getCtx = setup()
    act(() => getCtx().reorderItem(LIST_ID, 2, 0))
    const cherry = getList(getCtx()).items[0]
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

describe('addSection', () => {
  it('adds a section with empty itemIds and collapsed false', () => {
    const getCtx = setup()
    act(() => getCtx().addSection(LIST_ID, 'Dairy'))
    const sections = getList(getCtx()).sections
    expect(sections).toHaveLength(1)
    expect(sections[0]).toMatchObject({ name: 'Dairy', itemIds: [], collapsed: false })
  })
})

describe('updateSection', () => {
  it('updates section name', () => {
    const getCtx = setup()
    act(() => getCtx().addSection(LIST_ID, 'Dairy'))
    const sectionId = getList(getCtx()).sections[0].id
    act(() => getCtx().updateSection(LIST_ID, sectionId, { name: 'Produce' }))
    expect(getList(getCtx()).sections[0].name).toBe('Produce')
  })

  it('updates itemIds', () => {
    const getCtx = setup()
    act(() => getCtx().addSection(LIST_ID, 'Dairy'))
    const sectionId = getList(getCtx()).sections[0].id
    act(() => getCtx().updateSection(LIST_ID, sectionId, { itemIds: ['a', 'b'] }))
    expect(getList(getCtx()).sections[0].itemIds).toEqual(['a', 'b'])
  })
})

describe('deleteSection', () => {
  it('removes the section but keeps items', () => {
    const getCtx = setup()
    act(() => getCtx().addSection(LIST_ID, 'Dairy'))
    const sectionId = getList(getCtx()).sections[0].id
    act(() => getCtx().updateSection(LIST_ID, sectionId, { itemIds: ['a'] }))
    act(() => getCtx().deleteSection(LIST_ID, sectionId))
    const list = getList(getCtx())
    expect(list.sections).toHaveLength(0)
    expect(list.items.map(i => i.id)).toContain('a')
  })
})

describe('reorderSection', () => {
  it('reorders sections', () => {
    const getCtx = setup()
    act(() => { getCtx().addSection(LIST_ID, 'A'); getCtx().addSection(LIST_ID, 'B') })
    const [idA, idB] = getList(getCtx()).sections.map(s => s.id)
    act(() => getCtx().reorderSection(LIST_ID, 0, 1))
    expect(getList(getCtx()).sections.map(s => s.id)).toEqual([idB, idA])
  })
})

describe('reorderItemInSection', () => {
  it('reorders itemIds within a section', () => {
    const getCtx = setup()
    act(() => getCtx().addSection(LIST_ID, 'Dairy'))
    const sectionId = getList(getCtx()).sections[0].id
    act(() => getCtx().updateSection(LIST_ID, sectionId, { itemIds: ['a', 'b', 'c'] }))
    act(() => getCtx().reorderItemInSection(LIST_ID, sectionId, 0, 2))
    expect(getList(getCtx()).sections[0].itemIds).toEqual(['b', 'c', 'a'])
  })
})

describe('deleteItem cascade', () => {
  it('removes item id from section itemIds when item is deleted', () => {
    const getCtx = setup()
    act(() => getCtx().addSection(LIST_ID, 'Dairy'))
    const sectionId = getList(getCtx()).sections[0].id
    act(() => getCtx().updateSection(LIST_ID, sectionId, { itemIds: ['a', 'b'] }))
    act(() => getCtx().deleteItem(LIST_ID, 'a'))
    expect(getList(getCtx()).sections[0].itemIds).toEqual(['b'])
    expect(getList(getCtx()).items.map(i => i.id)).not.toContain('a')
  })
})
