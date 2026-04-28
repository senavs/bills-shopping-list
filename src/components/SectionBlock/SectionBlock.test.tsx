import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { SectionBlock } from './SectionBlock'
import type { List, Section } from '../../types'

afterEach(cleanup)

const list: List = {
  id: 'l1', name: 'Test', type: 'shopping', currency: 'USD',
  taxPercentage: 0, archived: false,
  items: [
    { id: 'a', name: 'Apple',  quantity: 1, unitPrice: 1, selected: false, includeInTax: false },
    { id: 'b', name: 'Banana', quantity: 1, unitPrice: 2, selected: false, includeInTax: false },
  ],
  sections: [],
}

const section: Section = { id: 's1', name: 'Dairy', itemIds: ['a', 'b'], collapsed: false }

const defaultProps = {
  section,
  sectionIndex: 0,
  totalSections: 1,
  list: { ...list, sections: [section] },
  onUpdateSection: vi.fn(),
  onDeleteSection: vi.fn(),
  onReorderSection: vi.fn(),
  onReorderItemInSection: vi.fn(),
  onEditItem: vi.fn(),
  onDeleteItem: vi.fn(),
  onToggleSelected: vi.fn(),
  onSectionDragStart: vi.fn(),
  onSectionDragOver: vi.fn(),
  onSectionDrop: vi.fn(),
  onSectionDragEnd: vi.fn(),
  isDragOver: false,
}

describe('SectionBlock', () => {
  it('renders section name', () => {
    render(<SectionBlock {...defaultProps} />)
    expect(screen.getByText(/dairy/i)).toBeDefined()
  })

  it('renders items when not collapsed', () => {
    render(<SectionBlock {...defaultProps} />)
    expect(screen.getByText('Apple')).toBeDefined()
    expect(screen.getByText('Banana')).toBeDefined()
  })

  it('hides items when collapsed', () => {
    render(<SectionBlock {...defaultProps} section={{ ...section, collapsed: true }} />)
    expect(screen.queryByText('Apple')).toBeNull()
    expect(screen.queryByText('Banana')).toBeNull()
  })

  it('calls onUpdateSection with collapsed toggle', () => {
    const onUpdateSection = vi.fn()
    render(<SectionBlock {...defaultProps} onUpdateSection={onUpdateSection} />)
    fireEvent.click(screen.getByLabelText('Collapse section'))
    expect(onUpdateSection).toHaveBeenCalledWith('s1', { collapsed: true })
  })

  it('shows delete confirm dialog and calls onDeleteSection', () => {
    const onDeleteSection = vi.fn()
    render(<SectionBlock {...defaultProps} onDeleteSection={onDeleteSection} />)
    // Section header Delete is first; item rows also have Delete buttons
    fireEvent.click(screen.getAllByText('Delete')[0])
    expect(screen.getByText(/delete "dairy"/i)).toBeDefined()
    // ConfirmDialog Delete button is the last Delete button in the DOM
    const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i })
    fireEvent.click(deleteButtons[deleteButtons.length - 1])
    expect(onDeleteSection).toHaveBeenCalledWith('s1')
  })

  it('shows rename form and calls onUpdateSection with new name', () => {
    const onUpdateSection = vi.fn()
    render(<SectionBlock {...defaultProps} onUpdateSection={onUpdateSection} />)
    fireEvent.click(screen.getByText('Rename'))
    fireEvent.change(screen.getByPlaceholderText('Section name'), { target: { value: 'Produce' } })
    fireEvent.click(screen.getByText('Save'))
    expect(onUpdateSection).toHaveBeenCalledWith('s1', { name: 'Produce' })
  })
})
