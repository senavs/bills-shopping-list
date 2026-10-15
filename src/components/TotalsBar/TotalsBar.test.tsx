import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { TotalsBar } from './TotalsBar'
import { LanguageProvider } from '../../contexts/LanguageContext'
import type { List } from '../../types'

afterEach(cleanup)

const list: List = {
  id: 'l1', name: 'Groceries', type: 'shopping', currency: 'USD',
  taxPercentage: 10, archived: false, sections: [],
  items: [
    { id: 'a', name: 'Apple', quantity: 2, unitPrice: 1, selected: true, includeInTax: true },
    { id: 'b', name: 'Bread', quantity: 1, unitPrice: 3, selected: false, includeInTax: true },
  ],
}

const renderBar = (overrides: Partial<List> = {}, onAddItem = vi.fn()) => {
  render(<LanguageProvider><TotalsBar list={{ ...list, ...overrides }} onAddItem={onAddItem} /></LanguageProvider>)
  return onAddItem
}

describe('TotalsBar', () => {
  it('leads with the cart total on shopping lists', () => {
    renderBar()
    expect(screen.getByText('In cart')).toBeDefined()
    expect(screen.getByTestId('totals-primary').textContent).toContain('2.00')
  })

  it('leads with the total including tax at restaurants', () => {
    renderBar({ type: 'restaurant' })
    expect(screen.getByTestId('totals-primary').textContent).toContain('5.50')
  })

  it('opens a sheet with every total when tapped', () => {
    renderBar()
    fireEvent.click(screen.getByLabelText('Show all totals'))
    expect(screen.getByText('Subtotal')).toBeDefined()
    expect(screen.getByText('Tax (10%)')).toBeDefined()
    expect(screen.getByText('Selected')).toBeDefined()
  })

  it('adds an item from the bar button', () => {
    const onAddItem = renderBar()
    fireEvent.click(screen.getByLabelText('Add item'))
    expect(onAddItem).toHaveBeenCalled()
  })
})
