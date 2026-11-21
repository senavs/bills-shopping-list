import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ItemSearch } from './ItemSearch'
import { LanguageProvider } from '../../contexts/LanguageContext'
import type { Item, List } from '../../types'

const milk: Item = { id: 'i1', name: 'Leite integral', quantity: 2, unitPrice: 5, selected: false, includeInTax: true }
const bread: Item = { id: 'i2', name: 'Pão', quantity: 1, unitPrice: 8, selected: true, includeInTax: true }

const list: List = {
  id: 'L1', name: 'Mercado', type: 'shopping', currency: 'BRL', taxPercentage: 0, archived: false,
  items: [bread, milk],
  sections: [{ id: 's1', name: 'Laticínios', itemIds: ['i1'], collapsed: true }],
}

const setup = () => {
  const onSelect = vi.fn()
  const onClose = vi.fn()
  localStorage.setItem('locale', 'en')
  render(<LanguageProvider><ItemSearch list={list} onSelect={onSelect} onClose={onClose} /></LanguageProvider>)
  const type = (q: string) => fireEvent.change(screen.getByRole('searchbox', { name: 'Search items' }), { target: { value: q } })
  return { onSelect, onClose, type }
}

afterEach(() => { cleanup(); localStorage.clear() })

describe('ItemSearch', () => {
  it('lists every item, collapsed sections included, when the query is empty', () => {
    setup()
    expect(screen.getByText('Leite integral')).toBeDefined()
    expect(screen.getByText('Pão')).toBeDefined()
  })

  it('filters by name and shows the section', () => {
    const { type } = setup()
    type('leite')
    expect(screen.getByText('Leite integral')).toBeDefined()
    expect(screen.getByText('Laticínios')).toBeDefined()
    expect(screen.queryByText('Pão')).toBeNull()
  })

  it('labels items outside any section as other items', () => {
    const { type } = setup()
    type('pao')
    expect(screen.getByText('Other items')).toBeDefined()
  })

  it('shows a no-results message', () => {
    const { type } = setup()
    type('zzz')
    expect(screen.getByText('No results for "zzz"')).toBeDefined()
  })

  it('selecting a result hands back that item', () => {
    const { onSelect, type } = setup()
    type('leite')
    fireEvent.click(screen.getByText('Leite integral'))
    expect(onSelect).toHaveBeenCalledWith(milk)
  })

  it('cancel and Escape close the search', () => {
    const { onClose } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
