import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Dashboard } from './Dashboard'
import { DarkModeProvider } from '../../contexts/DarkModeContext'
import { LanguageProvider } from '../../contexts/LanguageContext'
import * as useListsModule from '../../hooks/useLists'
import type { List } from '../../types'

vi.mock('../../hooks/useLists')

const renderDashboard = () => render(<BrowserRouter><LanguageProvider><DarkModeProvider><Dashboard /></DarkModeProvider></LanguageProvider></BrowserRouter>)

describe('Dashboard', () => {
  const mockUseLists = {
    lists: [] as List[],
    archiveList: vi.fn(),
    unarchiveList: vi.fn(),
    deleteList: vi.fn(),
    duplicateList: vi.fn(),
    saveAsTemplate: vi.fn(),
    createFromTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    addPerson: vi.fn(),
    removePerson: vi.fn(),
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

  it('opens bottom sheet and shows delete option via more button', async () => {
    mockUseLists.lists = [
      { id: '1', name: 'Test', type: 'shopping', currency: 'USD', taxPercentage: 0, items: [], sections: [], archived: false },
    ]
    vi.spyOn(useListsModule, 'useLists').mockReturnValue(mockUseLists)

    renderDashboard()

    // Click the ⋮ (more options) button on the card
    const moreBtn = screen.getByLabelText('More options')
    await act(async () => { fireEvent.click(moreBtn) })

    // BottomSheet should show with Delete action
    expect(screen.getByText('Delete')).toBeDefined()
  })

  it('calls deleteList when confirmed via bottom sheet', async () => {
    mockUseLists.lists = [
      { id: '1', name: 'Test', type: 'shopping', currency: 'USD', taxPercentage: 0, items: [], sections: [], archived: false },
    ]
    vi.spyOn(useListsModule, 'useLists').mockReturnValue(mockUseLists)

    renderDashboard()

    // Open bottom sheet via ⋮ button
    const moreBtn = screen.getByLabelText('More options')
    await act(async () => { fireEvent.click(moreBtn) })

    // Click Delete action in the bottom sheet
    await act(async () => { fireEvent.click(screen.getByText('Delete')) })

    // Confirm dialog should appear
    expect(screen.getByText('Delete List')).toBeDefined()

    // Confirm deletion
    await act(async () => { fireEvent.click(screen.getByText('Confirm')) })

    expect(mockUseLists.deleteList).toHaveBeenCalledWith('1')
  })
})
