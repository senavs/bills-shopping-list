import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ItemRow } from './ItemRow'
import { LanguageProvider } from '../../contexts/LanguageContext'
import type { Item } from '../../types'

afterEach(cleanup)

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => null,
    },
  },
}))

const baseItem: Item = {
  id: 'item-1',
  name: 'Rice',
  quantity: 2,
  unitPrice: 5.0,
  unitType: 'kg',
  selected: false,
  includeInTax: true,
}

const renderItemRow = (item: Item) => {
  return render(
    <LanguageProvider>
      <ItemRow
        item={item}
        currency="USD"
        onToggleSelected={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
      />
    </LanguageProvider>
  )
}

describe('ItemRow - unit type display', () => {
  it('displays unit abbreviation next to quantity for non-unit types (e.g., "2 kg")', () => {
    renderItemRow(baseItem)
    // The display format should be "2 kg × $5.00 = $10.00"
    expect(screen.getByText(/2 kg/)).toBeDefined()
  })

  it('omits unit abbreviation for unitType=unit with quantity=1', () => {
    const item: Item = { ...baseItem, unitType: 'unit', quantity: 1 }
    renderItemRow(item)
    // Should show just "1" not "1 unit"
    const display = screen.getByText(/^1 ×/)
    expect(display).toBeDefined()
    expect(display.textContent).not.toContain('1 unit')
  })

  it('displays quantity with unit for unitType=unit when quantity is not 1', () => {
    const item: Item = { ...baseItem, unitType: 'unit', quantity: 3 }
    renderItemRow(item)
    expect(screen.getByText(/3 unit/)).toBeDefined()
  })

  it('displays ml unit correctly', () => {
    const item: Item = { ...baseItem, unitType: 'ml', quantity: 500 }
    renderItemRow(item)
    expect(screen.getByText(/500 ml/)).toBeDefined()
  })
})

describe('ItemRow - interaction', () => {
  const renderWith = (props: Partial<React.ComponentProps<typeof ItemRow>> = {}) => {
    const handlers = {
      onToggleSelected: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onDuplicate: vi.fn(),
    }
    render(
      <LanguageProvider>
        <ItemRow item={baseItem} currency="USD" {...handlers} {...props} />
      </LanguageProvider>
    )
    return handlers
  }

  it('toggles selection when the row is tapped', () => {
    const { onToggleSelected } = renderWith()
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onToggleSelected).toHaveBeenCalledWith(true)
  })

  it('exposes the selected state on the row checkbox', () => {
    renderWith({ item: { ...baseItem, selected: true } })
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true')
  })

  it('opens the editor when a template row is tapped', () => {
    const { onEdit, onToggleSelected } = renderWith({ hideCheckbox: true })
    fireEvent.click(screen.getByLabelText('Edit Rice'))
    expect(onEdit).toHaveBeenCalled()
    expect(onToggleSelected).not.toHaveBeenCalled()
  })

  it('deletes straight from the options sheet without a confirmation dialog', () => {
    const { onDelete } = renderWith()
    fireEvent.click(screen.getByLabelText('Item options'))
    fireEvent.click(screen.getByText('Delete'))
    expect(onDelete).toHaveBeenCalled()
    expect(screen.queryByText('Confirm')).toBeNull()
  })

  it('hides the drag handle outside reorder mode', () => {
    renderWith()
    expect(screen.queryByLabelText('Drag to reorder')).toBeNull()
  })

  it('shows the drag handle and ignores taps in reorder mode', () => {
    const { onToggleSelected } = renderWith({ reorderMode: true })
    expect(screen.getByLabelText('Drag to reorder')).toBeDefined()
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onToggleSelected).not.toHaveBeenCalled()
  })
})

describe('ItemRow - assignment badges', () => {
  const people = [{ id: 'p1', name: 'Ana' }, { id: 'p2', name: 'Bia' }]
  const renderWithPeople = (item: Item) => render(
    <LanguageProvider>
      <ItemRow item={item} currency="USD" people={people} onToggleSelected={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onDuplicate={vi.fn()} />
    </LanguageProvider>
  )

  it('labels unassigned items as split among everyone', () => {
    renderWithPeople(baseItem)
    expect(screen.getByText('Split among everyone')).toBeDefined()
  })

  it('shows assignee names instead of the split label', () => {
    renderWithPeople({ ...baseItem, assignedTo: ['p2'] })
    expect(screen.getByText('Bia')).toBeDefined()
    expect(screen.queryByText('Split among everyone')).toBeNull()
  })
})
