import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ItemForm } from './ItemForm'
import type { Item, Section } from '../../types'

afterEach(cleanup)

const baseItem: Item = {
  id: '1', name: 'Milk', quantity: 2, unitPrice: 3.5,
  selected: true, includeInTax: false,
}

const sections: Pick<Section, 'id' | 'name'>[] = [
  { id: 's1', name: 'Dairy' },
  { id: 's2', name: 'Produce' },
]

const fillAndSubmit = (name = 'Milk') => {
  const input = screen.getByPlaceholderText('e.g., Milk')
  fireEvent.change(input, { target: { value: name } })
  fireEvent.submit(input.closest('form')!)
}

describe('ItemForm — selected checkbox', () => {
  it('renders the Selected checkbox', () => {
    render(<ItemForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText(/selected/i)).toBeDefined()
  })

  it('defaults to unchecked when creating a new item', () => {
    render(<ItemForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    const checkbox = screen.getByLabelText(/selected/i) as HTMLInputElement
    expect(checkbox.checked).toBe(false)
  })

  it('reflects item.selected=true when editing', () => {
    render(<ItemForm item={baseItem} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    const checkbox = screen.getByLabelText(/selected/i) as HTMLInputElement
    expect(checkbox.checked).toBe(true)
  })

  it('reflects item.selected=false when editing', () => {
    render(<ItemForm item={{ ...baseItem, selected: false }} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    const checkbox = screen.getByLabelText(/selected/i) as HTMLInputElement
    expect(checkbox.checked).toBe(false)
  })

  it('submits selected=true when checkbox is checked', () => {
    const onSubmit = vi.fn()
    render(<ItemForm onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByLabelText(/selected/i))
    fillAndSubmit()
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ selected: true }), '')
  })

  it('submits selected=false when checkbox is unchecked', () => {
    const onSubmit = vi.fn()
    render(<ItemForm item={baseItem} onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByLabelText(/selected/i))
    fireEvent.submit(screen.getByPlaceholderText('e.g., Milk').closest('form')!)
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ selected: false }), '')
  })
})

describe('ItemForm — section dropdown', () => {
  it('does not render section dropdown when no sections provided', () => {
    render(<ItemForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByLabelText(/section/i)).toBeNull()
  })

  it('renders section dropdown with No section default when sections provided', () => {
    render(<ItemForm sections={sections} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    const select = screen.getByLabelText(/section/i) as HTMLSelectElement
    expect(select.value).toBe('')
    expect(screen.getByText('No section')).toBeDefined()
  })

  it('renders all section options', () => {
    render(<ItemForm sections={sections} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Dairy')).toBeDefined()
    expect(screen.getByText('Produce')).toBeDefined()
  })

  it('pre-selects initialSectionId when provided', () => {
    render(<ItemForm sections={sections} initialSectionId="s2" onSubmit={vi.fn()} onCancel={vi.fn()} />)
    const select = screen.getByLabelText(/section/i) as HTMLSelectElement
    expect(select.value).toBe('s2')
  })

  it('submits the selected sectionId', () => {
    const onSubmit = vi.fn()
    render(<ItemForm sections={sections} onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/section/i), { target: { value: 's1' } })
    fillAndSubmit()
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Milk' }), 's1')
  })

  it('submits empty sectionId when No section is selected', () => {
    const onSubmit = vi.fn()
    render(<ItemForm sections={sections} initialSectionId="s1" onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/section/i), { target: { value: '' } })
    fillAndSubmit()
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Milk' }), '')
  })
})
