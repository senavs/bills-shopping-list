import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { SectionBlock } from './SectionBlock'
import { LanguageProvider } from '../../contexts/LanguageContext'
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
  list: { ...list, sections: [section] },
  onUpdateSection: vi.fn(),
  onDeleteSection: vi.fn(),
  onReorderItemInSection: vi.fn(),
  onEditItem: vi.fn(),
  onDeleteItem: vi.fn(),
  onDuplicateItem: vi.fn(),
  onToggleSelected: vi.fn(),
}

describe('SectionBlock', () => {
  it('renders section name', () => {
    render(<LanguageProvider><SectionBlock {...defaultProps} /></LanguageProvider>)
    expect(screen.getByText(/dairy/i)).toBeDefined()
  })

  it('renders items when not collapsed', () => {
    render(<LanguageProvider><SectionBlock {...defaultProps} /></LanguageProvider>)
    expect(screen.getByText('Apple')).toBeDefined()
    expect(screen.getByText('Banana')).toBeDefined()
  })

  it('hides items when collapsed', () => {
    render(<LanguageProvider><SectionBlock {...defaultProps} section={{ ...section, collapsed: true }} /></LanguageProvider>)
    expect(screen.queryByText('Apple')).toBeNull()
    expect(screen.queryByText('Banana')).toBeNull()
  })

  it('calls onUpdateSection with collapsed toggle', () => {
    const onUpdateSection = vi.fn()
    render(<LanguageProvider><SectionBlock {...defaultProps} onUpdateSection={onUpdateSection} /></LanguageProvider>)
    fireEvent.click(screen.getByLabelText('Collapse section'))
    expect(onUpdateSection).toHaveBeenCalledWith('s1', { collapsed: true })
  })

  it('shows delete confirm dialog via bottom sheet and calls onDeleteSection', async () => {
    const onDeleteSection = vi.fn()
    render(<LanguageProvider><SectionBlock {...defaultProps} onDeleteSection={onDeleteSection} /></LanguageProvider>)

    // Open the section options bottom sheet
    await act(async () => { fireEvent.click(screen.getByLabelText('Section options')) })

    // Click Delete action in the bottom sheet
    const deleteButtons = screen.getAllByText('Delete')
    // The last 'Delete' in the BottomSheet actions (first ones may be from item rows)
    await act(async () => { fireEvent.click(deleteButtons[deleteButtons.length - 1]) })

    // ConfirmDialog should appear
    expect(screen.getByText(/delete "dairy"/i)).toBeDefined()
    await act(async () => { fireEvent.click(screen.getByText('Confirm')) })
    expect(onDeleteSection).toHaveBeenCalledWith('s1')
  })

  it('shows rename form via bottom sheet and calls onUpdateSection with new name', async () => {
    const onUpdateSection = vi.fn()
    render(<LanguageProvider><SectionBlock {...defaultProps} onUpdateSection={onUpdateSection} /></LanguageProvider>)

    // Open the section options bottom sheet
    await act(async () => { fireEvent.click(screen.getByLabelText('Section options')) })

    // Click Rename action in the bottom sheet
    await act(async () => { fireEvent.click(screen.getByText('Rename')) })

    // Fill rename form
    fireEvent.change(screen.getByPlaceholderText('Section name'), { target: { value: 'Produce' } })
    fireEvent.click(screen.getByText('Save'))
    expect(onUpdateSection).toHaveBeenCalledWith('s1', { name: 'Produce' })
  })
})
