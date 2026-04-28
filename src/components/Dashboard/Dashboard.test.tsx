import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Dashboard } from './Dashboard'
import { DarkModeProvider } from '../../contexts/DarkModeContext'
import * as useListsModule from '../../hooks/useLists'
import type { List } from '../../types'

vi.mock('../../hooks/useLists')

const renderDashboard = () => render(<BrowserRouter><DarkModeProvider><Dashboard /></DarkModeProvider></BrowserRouter>)

describe('Dashboard', () => {
  const mockUseLists = {
    lists: [] as List[],
    archiveList: vi.fn(),
    unarchiveList: vi.fn(),
    deleteList: vi.fn(),
    duplicateList: vi.fn(),
    createList: vi.fn(),
    updateList: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    reorderItem: vi.fn(),
    addSection: vi.fn(),
    updateSection: vi.fn(),
    deleteSection: vi.fn(),
    reorderSection: vi.fn(),
    reorderItemInSection: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(useListsModule, 'useLists').mockReturnValue(mockUseLists)
  })

  afterEach(() => {
    cleanup()
  })

  it('renders active and archived tabs', () => {
    renderDashboard()
    expect(screen.getByText('Archived')).toBeDefined()
  })

  it('shows empty state when no lists', () => {
    renderDashboard()
    expect(screen.getAllByText(/No active lists yet/)[0]).toBeDefined()
  })

  it('displays active lists in active tab', () => {
    mockUseLists.lists = [
      { id: '1', name: 'Groceries', type: 'shopping', currency: 'USD', taxPercentage: 0, items: [], sections: [], archived: false },
    ]
    vi.spyOn(useListsModule, 'useLists').mockReturnValue(mockUseLists)

    renderDashboard()
    expect(screen.getByText('Groceries')).toBeDefined()
  })

  it('shows delete confirmation dialog', () => {
    mockUseLists.lists = [
      { id: '1', name: 'Test', type: 'shopping', currency: 'USD', taxPercentage: 0, items: [], sections: [], archived: false },
    ]
    vi.spyOn(useListsModule, 'useLists').mockReturnValue(mockUseLists)

    renderDashboard()
    const deleteBtn = screen.getAllByText('Delete')[0]
    fireEvent.click(deleteBtn)
    
    expect(screen.getByText('Delete List')).toBeDefined()
  })

  it('calls deleteList when confirmed', () => {
    mockUseLists.lists = [
      { id: '1', name: 'Test', type: 'shopping', currency: 'USD', taxPercentage: 0, items: [], sections: [], archived: false },
    ]
    vi.spyOn(useListsModule, 'useLists').mockReturnValue(mockUseLists)

    renderDashboard()
    fireEvent.click(screen.getAllByText('Delete')[0])
    fireEvent.click(screen.getAllByText('Delete')[1]) // Confirm button
    
    expect(mockUseLists.deleteList).toHaveBeenCalledWith('1')
  })
})
