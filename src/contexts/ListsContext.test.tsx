import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
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

describe('updatedAt stamping', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('stamps updatedAt when an item changes', () => {
    vi.spyOn(Date, 'now').mockReturnValue(5_000)
    const getCtx = setup()
    act(() => getCtx().updateItem(LIST_ID, 'a', { name: 'Apricot' }))
    expect(getList(getCtx()).updatedAt).toBe(5_000)
  })

  it('stamps updatedAt on create, duplicate and archive', () => {
    vi.spyOn(Date, 'now').mockReturnValue(7_000)
    const getCtx = setup()
    act(() => getCtx().createList({ name: 'New', type: 'shopping', currency: 'BRL', taxPercentage: 0 }))
    act(() => getCtx().duplicateList(LIST_ID))
    act(() => getCtx().archiveList(LIST_ID))
    expect(getCtx().lists.map(l => l.updatedAt)).toEqual([7_000, 7_000, 7_000])
  })

  it('replaceLists does not stamp updatedAt', () => {
    vi.spyOn(Date, 'now').mockReturnValue(9_000)
    const getCtx = setup()
    act(() => getCtx().replaceLists([{ ...makeList(), name: 'Remote', updatedAt: 42 }]))
    expect(getList(getCtx())).toMatchObject({ name: 'Remote', updatedAt: 42 })
  })
})

describe('preset templates', () => {
  const preset: List = {
    id: 'preset-x',
    name: 'Compras do Mês',
    type: 'shopping',
    currency: 'BRL',
    taxPercentage: 0,
    archived: false,
    isTemplate: true,
    items: [],
    sections: [
      { id: 'preset-x-0', name: 'Geladeira', itemIds: [], collapsed: false },
      { id: 'preset-x-1', name: 'Outros', itemIds: [], collapsed: false },
    ],
  }

  it('createFromPreset adds a regular list with fresh ids', () => {
    const getCtx = setup()
    act(() => getCtx().createFromPreset(preset))
    const created = getCtx().lists[1]
    expect(created).toMatchObject({ name: 'Compras do Mês', isTemplate: false, archived: false, taxPercentage: 0 })
    expect(created.id).not.toBe(preset.id)
    expect(created.sections.map(s => s.name)).toEqual(['Geladeira', 'Outros'])
    expect(created.sections.map(s => s.id)).not.toContain('preset-x-0')
    expect(created.updatedAt).toBeTypeOf('number')
  })

  it('copyPresetToTemplates adds an editable template owned by the user', () => {
    const getCtx = setup()
    act(() => getCtx().copyPresetToTemplates(preset))
    const copy = getCtx().lists[1]
    expect(copy).toMatchObject({ name: 'Compras do Mês', isTemplate: true })
    expect(copy.id).not.toBe(preset.id)
    expect(copy.sections).toHaveLength(2)
  })
})

describe('shared lists', () => {
  const create = (getCtx: () => ReturnType<typeof useLists>) => {
    let id = ''
    act(() => { id = getCtx().createSharedList({ name: 'Bar', type: 'bar', currency: 'BRL', taxPercentage: 10 }, { uid: 'u1', name: 'Ana' }) })
    return id
  }
  const byId = (ctx: ReturnType<typeof useLists>, id: string) => ctx.lists.find(l => l.id === id)!

  it('createSharedList creates the owner person and links it', () => {
    const getCtx = setup()
    const id = create(getCtx)
    const list = byId(getCtx(), id)
    expect(list.shared?.ownerUid).toBe('u1')
    expect(list.shared?.inviteToken).toHaveLength(36)
    expect(list.people?.[0].name).toBe('Ana')
    expect(list.shared?.memberPeople?.u1).toBe(list.people?.[0].id)
    expect(list.updatedAt).toBeTypeOf('number')
  })

  it('addMemberPerson adds a person linked to the member', () => {
    const getCtx = setup()
    const id = create(getCtx)
    act(() => getCtx().addMemberPerson(id, 'u2', 'Bia'))
    const list = byId(getCtx(), id)
    const bia = list.people!.find(p => p.name === 'Bia')!
    expect(list.shared?.memberPeople?.u2).toBe(bia.id)
    expect(list.shared?.memberPeople?.u1).toBe(list.people![0].id)
  })

  it('duplicates and templates of a shared list are private', () => {
    const getCtx = setup()
    const id = create(getCtx)
    act(() => getCtx().duplicateList(id))
    act(() => getCtx().saveAsTemplate(id))
    const template = getCtx().lists.find(l => l.isTemplate)!
    act(() => getCtx().createFromTemplate(template.id))
    const copies = getCtx().lists.filter(l => l.id !== id && l.id !== LIST_ID)
    expect(copies).toHaveLength(3)
    for (const c of copies) expect(c.shared).toBeUndefined()
  })

  it('replaceLists accepts an updater without stamping', () => {
    const getCtx = setup()
    const id = create(getCtx)
    const before = byId(getCtx(), id).updatedAt
    act(() => getCtx().replaceLists(prev => prev.filter(l => l.id !== LIST_ID)))
    expect(getCtx().lists.map(l => l.id)).toEqual([id])
    expect(byId(getCtx(), id).updatedAt).toBe(before)
  })
})
