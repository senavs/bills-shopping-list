import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
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
