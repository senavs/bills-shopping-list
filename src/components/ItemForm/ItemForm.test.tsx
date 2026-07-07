import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import fc from 'fast-check'
import { ItemForm } from './ItemForm'
import { LanguageProvider } from '../../contexts/LanguageContext'
import type { Item, Section, UnitType } from '../../types'
import { UNIT_TYPES } from '../../types'

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

describe('ItemForm - selected checkbox', () => {
  it('renders the Selected checkbox', () => {
    render(<LanguageProvider><ItemForm onSubmit={vi.fn()} onCancel={vi.fn()} /></LanguageProvider>)
    expect(screen.getByLabelText(/selected/i)).toBeDefined()
  })

  it('defaults to unchecked when creating a new item', () => {
    render(<LanguageProvider><ItemForm onSubmit={vi.fn()} onCancel={vi.fn()} /></LanguageProvider>)
    const checkbox = screen.getByLabelText(/selected/i) as HTMLInputElement
    expect(checkbox.checked).toBe(false)
  })

  it('reflects item.selected=true when editing', () => {
    render(<LanguageProvider><ItemForm item={baseItem} onSubmit={vi.fn()} onCancel={vi.fn()} /></LanguageProvider>)
    const checkbox = screen.getByLabelText(/selected/i) as HTMLInputElement
    expect(checkbox.checked).toBe(true)
  })

  it('reflects item.selected=false when editing', () => {
    render(<LanguageProvider><ItemForm item={{ ...baseItem, selected: false }} onSubmit={vi.fn()} onCancel={vi.fn()} /></LanguageProvider>)
    const checkbox = screen.getByLabelText(/selected/i) as HTMLInputElement
    expect(checkbox.checked).toBe(false)
  })

  it('submits selected=true when checkbox is checked', () => {
    const onSubmit = vi.fn()
    render(<LanguageProvider><ItemForm onSubmit={onSubmit} onCancel={vi.fn()} /></LanguageProvider>)
    fireEvent.click(screen.getByLabelText(/selected/i))
    fillAndSubmit()
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ selected: true }), '')
  })

  it('submits selected=false when checkbox is unchecked', () => {
    const onSubmit = vi.fn()
    render(<LanguageProvider><ItemForm item={baseItem} onSubmit={onSubmit} onCancel={vi.fn()} /></LanguageProvider>)
    fireEvent.click(screen.getByLabelText(/selected/i))
    fireEvent.submit(screen.getByPlaceholderText('e.g., Milk').closest('form')!)
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ selected: false }), '')
  })
})

describe('ItemForm - section dropdown', () => {
  it('does not render section dropdown when no sections provided', () => {
    render(<LanguageProvider><ItemForm onSubmit={vi.fn()} onCancel={vi.fn()} /></LanguageProvider>)
    expect(screen.queryByLabelText(/section/i)).toBeNull()
  })

  it('renders section dropdown with No section default when sections provided', () => {
    render(<LanguageProvider><ItemForm sections={sections} onSubmit={vi.fn()} onCancel={vi.fn()} /></LanguageProvider>)
    const select = screen.getByLabelText(/section/i) as HTMLSelectElement
    expect(select.value).toBe('')
    expect(screen.getByText('No section')).toBeDefined()
  })

  it('renders all section options', () => {
    render(<LanguageProvider><ItemForm sections={sections} onSubmit={vi.fn()} onCancel={vi.fn()} /></LanguageProvider>)
    expect(screen.getByText('Dairy')).toBeDefined()
    expect(screen.getByText('Produce')).toBeDefined()
  })

  it('pre-selects initialSectionId when provided', () => {
    render(<LanguageProvider><ItemForm sections={sections} initialSectionId="s2" onSubmit={vi.fn()} onCancel={vi.fn()} /></LanguageProvider>)
    const select = screen.getByLabelText(/section/i) as HTMLSelectElement
    expect(select.value).toBe('s2')
  })

  it('submits the selected sectionId', () => {
    const onSubmit = vi.fn()
    render(<LanguageProvider><ItemForm sections={sections} onSubmit={onSubmit} onCancel={vi.fn()} /></LanguageProvider>)
    fireEvent.change(screen.getByLabelText(/section/i), { target: { value: 's1' } })
    fillAndSubmit()
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Milk' }), 's1')
  })

  it('submits empty sectionId when No section is selected', () => {
    const onSubmit = vi.fn()
    render(<LanguageProvider><ItemForm sections={sections} initialSectionId="s1" onSubmit={onSubmit} onCancel={vi.fn()} /></LanguageProvider>)
    fireEvent.change(screen.getByLabelText(/section/i), { target: { value: '' } })
    fillAndSubmit()
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Milk' }), '')
  })
})



describe('ItemForm - unit type selector', () => {
  it('renders selector with all 9 unit type options in add mode', () => {
    render(<LanguageProvider><ItemForm onSubmit={vi.fn()} onCancel={vi.fn()} /></LanguageProvider>)
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[]
    // The unit type select is the one with 9 options (unit, kg, lb, g, liter, ml, pack, dozen, oz)
    const unitSelect = selects.find(s => s.options.length === 9)!
    expect(unitSelect).toBeDefined()
    const values = Array.from(unitSelect.options).map(o => o.value)
    expect(values).toEqual(['unit', 'kg', 'lb', 'g', 'liter', 'ml', 'pack', 'dozen', 'oz'])
  })

  it('pre-selects item current unitType in edit mode', () => {
    const item: Item = { ...baseItem, unitType: 'kg' }
    render(<LanguageProvider><ItemForm item={item} onSubmit={vi.fn()} onCancel={vi.fn()} /></LanguageProvider>)
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[]
    const unitSelect = selects.find(s => s.options.length === 9)!
    expect(unitSelect.value).toBe('kg')
  })

  it('selector is adjacent to quantity field in same grid-cols-3 row', () => {
    const { container } = render(<LanguageProvider><ItemForm onSubmit={vi.fn()} onCancel={vi.fn()} /></LanguageProvider>)
    const grid = container.querySelector('.grid.grid-cols-3')
    expect(grid).not.toBeNull()
    // The grid should contain 3 children: quantity, unit type, unit price
    expect(grid!.children.length).toBe(3)
  })

  it('renders localized labels in pt-BR locale', () => {
    // Force pt-BR by setting localStorage before rendering LanguageProvider
    localStorage.setItem('locale', 'pt-BR')
    render(<LanguageProvider><ItemForm onSubmit={vi.fn()} onCancel={vi.fn()} /></LanguageProvider>)
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[]
    const unitSelect = selects.find(s => s.options.length === 9)!
    const labels = Array.from(unitSelect.options).map(o => o.text)
    // pt-BR labels: unidade, kg, lb, g, litro, ml, pacote, dúzia, oz
    expect(labels).toContain('unidade')
    expect(labels).toContain('litro')
    expect(labels).toContain('pacote')
    expect(labels).toContain('dúzia')
    localStorage.removeItem('locale')
  })
})

describe('ItemForm - Property 7: Form pre-selects current unitType on edit', () => {
  /** **Validates: Requirements 2.2** */
  it('pre-selects the item unitType for any valid unitType', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...UNIT_TYPES),
        (unitType: UnitType) => {
          cleanup()
          const item: Item = {
            id: 'test-id',
            name: 'Test Item',
            quantity: 1,
            unitPrice: 5,
            unitType,
            selected: false,
            includeInTax: true,
          }
          render(<LanguageProvider><ItemForm item={item} onSubmit={vi.fn()} onCancel={vi.fn()} /></LanguageProvider>)
          const selects = screen.getAllByRole('combobox') as HTMLSelectElement[]
          const unitSelect = selects.find(s => s.options.length === 9)!
          expect(unitSelect.value).toBe(unitType)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('ItemForm - Property 8: Form submit includes selected unitType', () => {
  /** **Validates: Requirements 2.4** */
  it('submitted item data includes the selected unitType', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...UNIT_TYPES),
        (unitType: UnitType) => {
          cleanup()
          const onSubmit = vi.fn()
          render(<LanguageProvider><ItemForm onSubmit={onSubmit} onCancel={vi.fn()} /></LanguageProvider>)

          // Select the unit type
          const selects = screen.getAllByRole('combobox') as HTMLSelectElement[]
          const unitSelect = selects.find(s => s.options.length === 9)!
          fireEvent.change(unitSelect, { target: { value: unitType } })

          // Fill name and submit
          const nameInput = screen.getByPlaceholderText('e.g., Milk')
          fireEvent.change(nameInput, { target: { value: 'Test' } })
          fireEvent.submit(nameInput.closest('form')!)

          expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({ unitType }),
            expect.any(String)
          )
        }
      ),
      { numRuns: 100 }
    )
  })
})
