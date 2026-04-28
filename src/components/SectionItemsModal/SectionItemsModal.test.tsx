import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { SectionItemsModal } from './SectionItemsModal'
import type { Item } from '../../types'

afterEach(cleanup)

const items: Item[] = [
  { id: 'a', name: 'Apple',  quantity: 1, unitPrice: 1, selected: false, includeInTax: false },
  { id: 'b', name: 'Banana', quantity: 1, unitPrice: 1, selected: false, includeInTax: false },
  { id: 'c', name: 'Cherry', quantity: 1, unitPrice: 1, selected: false, includeInTax: false },
]

describe('SectionItemsModal', () => {
  it('renders available items', () => {
    render(<SectionItemsModal allItems={items} assignedItemIds={[]} unavailableItemIds={[]} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Apple')).toBeDefined()
    expect(screen.getByText('Banana')).toBeDefined()
    expect(screen.getByText('Cherry')).toBeDefined()
  })

  it('hides unavailable items (in other sections)', () => {
    render(<SectionItemsModal allItems={items} assignedItemIds={[]} unavailableItemIds={['b']} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByText('Banana')).toBeNull()
    expect(screen.getByText('Apple')).toBeDefined()
  })

  it('pre-checks assigned items', () => {
    render(<SectionItemsModal allItems={items} assignedItemIds={['a']} unavailableItemIds={[]} onSave={vi.fn()} onCancel={vi.fn()} />)
    const appleCheckbox = screen.getByLabelText('Apple') as HTMLInputElement
    const bananaCheckbox = screen.getByLabelText('Banana') as HTMLInputElement
    expect(appleCheckbox.checked).toBe(true)
    expect(bananaCheckbox.checked).toBe(false)
  })

  it('calls onSave with selected ids', () => {
    const onSave = vi.fn()
    render(<SectionItemsModal allItems={items} assignedItemIds={['a']} unavailableItemIds={[]} onSave={onSave} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Banana'))
    fireEvent.click(screen.getByText('Save'))
    const saved: string[] = onSave.mock.calls[0][0]
    expect(saved).toContain('a')
    expect(saved).toContain('b')
  })

  it('calls onSave with empty array when nothing selected', () => {
    const onSave = vi.fn()
    render(<SectionItemsModal allItems={items} assignedItemIds={[]} unavailableItemIds={[]} onSave={onSave} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByText('Save'))
    expect(onSave).toHaveBeenCalledWith([])
  })

  it('calls onCancel', () => {
    const onCancel = vi.fn()
    render(<SectionItemsModal allItems={items} assignedItemIds={[]} unavailableItemIds={[]} onSave={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('shows message when no items available', () => {
    render(<SectionItemsModal allItems={items} assignedItemIds={[]} unavailableItemIds={['a','b','c']} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('No available items.')).toBeDefined()
  })
})
