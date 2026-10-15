import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Dashboard } from './Dashboard'
import { DarkModeProvider } from '../../contexts/DarkModeContext'
import { LanguageProvider } from '../../contexts/LanguageContext'
import * as useListsModule from '../../hooks/useLists'
import type { List } from '../../types'
import { SyncContext, type SyncContextValue } from '../../contexts/SyncContext'

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
    duplicateItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    reorderItem: vi.fn(),
    addSection: vi.fn(),
    updateSection: vi.fn(),
    deleteSection: vi.fn(),
    reorderSection: vi.fn(),
    reorderItemInSection: vi.fn(),
    replaceLists: vi.fn(),
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

  it('renders the list filters as a segmented control', () => {
    renderDashboard()
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
    expect(tabs[0].getAttribute('aria-selected')).toBe('true')
  })

  it('groups preferences and data tools in the settings sheet', async () => {
    renderDashboard()
    await act(async () => { fireEvent.click(screen.getByLabelText('Settings')) })
    expect(screen.getByText('Export')).toBeDefined()
    expect(screen.getByText('Import')).toBeDefined()
    expect(screen.getByText('Mudar para Português')).toBeDefined()
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

  describe('cloud sync entry', () => {
    const syncValue = (over: Partial<SyncContextValue> = {}): SyncContextValue => ({
      status: 'signedOut', errorKind: null, lastSyncedAt: null,
      prepare: vi.fn(), signIn: vi.fn(async () => {}), signOut: vi.fn(async () => {}), syncNow: vi.fn(),
      ...over,
    })
    const renderWithSync = (v: SyncContextValue) => render(
      <BrowserRouter><LanguageProvider><DarkModeProvider><SyncContext.Provider value={v}><Dashboard /></SyncContext.Provider></DarkModeProvider></LanguageProvider></BrowserRouter>,
    )
    const openSettings = () => fireEvent.click(screen.getByRole('button', { name: /^(settings|ajustes)$/i }))

    it('hides the sync entry when sync is disabled', () => {
      renderDashboard()
      openSettings()
      expect(screen.queryByText(/sync with google|sincronizar com google/i)).toBeNull()
    })

    it('signed out: preloads on open and signs in from the sheet', () => {
      const v = syncValue()
      renderWithSync(v)
      openSettings()
      expect(v.prepare).toHaveBeenCalled()
      fireEvent.click(screen.getByText(/sync with google|sincronizar com google/i))
      expect(v.signIn).toHaveBeenCalled()
    })
  })
})
