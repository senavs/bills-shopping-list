import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Dashboard } from './Dashboard'
import * as useListsModule from '../../hooks/useLists'
import type { List } from '../../types'

vi.mock('../../hooks/useLists')

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
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(useListsModule, 'useLists').mockReturnValue(mockUseLists)
  })

  afterEach(() => {
    cleanup()
  })

  it('renders active and archived tabs', () => {
    render(<Dashboard />)
    expect(screen.getByText('Active')).toBeDefined()
    expect(screen.getByText('Archived')).toBeDefined()
  })

  it('shows empty state when no lists', () => {
    render(<Dashboard />)
    expect(screen.getAllByText(/No active lists yet/)[0]).toBeDefined()
  })

  it('displays active lists in active tab', () => {
    mockUseLists.lists = [
      { id: '1', name: 'Groceries', type: 'shopping', currency: 'USD', taxPercentage: 0, items: [], archived: false },
    ]
    vi.spyOn(useListsModule, 'useLists').mockReturnValue(mockUseLists)

    render(<Dashboard />)
    expect(screen.getByText('Groceries')).toBeDefined()
  })

  it('shows delete confirmation dialog', () => {
    mockUseLists.lists = [
      { id: '1', name: 'Test', type: 'shopping', currency: 'USD', taxPercentage: 0, items: [], archived: false },
    ]
    vi.spyOn(useListsModule, 'useLists').mockReturnValue(mockUseLists)

    render(<Dashboard />)
    const deleteBtn = screen.getAllByText('Delete')[0]
    fireEvent.click(deleteBtn)
    
    expect(screen.getByText('Delete List')).toBeDefined()
  })

  it('calls deleteList when confirmed', () => {
    mockUseLists.lists = [
      { id: '1', name: 'Test', type: 'shopping', currency: 'USD', taxPercentage: 0, items: [], archived: false },
    ]
    vi.spyOn(useListsModule, 'useLists').mockReturnValue(mockUseLists)

    render(<Dashboard />)
    fireEvent.click(screen.getAllByText('Delete')[0])
    fireEvent.click(screen.getAllByText('Delete')[1]) // Confirm button
    
    expect(mockUseLists.deleteList).toHaveBeenCalledWith('1')
  })
})
