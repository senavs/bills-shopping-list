import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Dashboard } from './Dashboard'
import { DarkModeProvider } from '../../contexts/DarkModeContext'
import { LanguageProvider } from '../../contexts/LanguageContext'
import * as useListsModule from '../../hooks/useLists'
import type { List } from '../../types'
import { SyncContext, type SyncContextValue } from '../../contexts/SyncContext'
import * as importExport from '../../lib/importExport'

vi.mock('../../hooks/useLists')
vi.mock('../../lib/importExport', async importOriginal => ({
  ...(await importOriginal<typeof import('../../lib/importExport')>()),
  exportData: vi.fn(),
  importData: vi.fn(),
}))

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
    createFromPreset: vi.fn(),
    copyPresetToTemplates: vi.fn(),
    addPerson: vi.fn(),
    removePerson: vi.fn(),
    createList: vi.fn(),
    createSharedList: vi.fn(() => 'new-id'),
    addMemberPerson: vi.fn(),
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

  describe('templates tab', () => {
    const openTemplates = () => fireEvent.click(screen.getByRole('tab', { name: 'Templates' }))

    it('shows my templates and the ready-made templates', () => {
      renderDashboard()
      openTemplates()
      expect(screen.getByRole('heading', { name: 'My templates' })).toBeDefined()
      expect(screen.getByText('No templates yet')).toBeDefined()
      expect(screen.getByRole('heading', { name: 'Ready-made templates' })).toBeDefined()
      expect(screen.getByText('Monthly Groceries')).toBeDefined()
      expect(screen.getByText('Fridge, Pantry, Laundry, Bathroom, Bedroom, Other')).toBeDefined()
    })

    it('offers only use and copy for a ready-made template', () => {
      renderDashboard()
      openTemplates()
      fireEvent.click(screen.getByText('Monthly Groceries'))
      expect(screen.getByText('Copy to My Templates')).toBeDefined()
      expect(screen.queryByText('Delete')).toBeNull()
      expect(screen.queryByText('Edit')).toBeNull()

      fireEvent.click(screen.getByText('Copy to My Templates'))
      expect(mockUseLists.copyPresetToTemplates).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Monthly Groceries', isTemplate: true }),
      )
    })

    it('creates a list from a ready-made template after confirming', () => {
      renderDashboard()
      openTemplates()
      fireEvent.click(screen.getByText('Monthly Groceries'))
      fireEvent.click(screen.getByText('Use Template'))
      fireEvent.click(screen.getByRole('button', { name: 'Use Template' }))
      expect(mockUseLists.createFromPreset).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Monthly Groceries', taxPercentage: 0 }),
      )
    })
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
      status: 'signedOut', errorKind: null, lastSyncedAt: null, uid: null, backend: null,
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

    it('recommends syncing after an export when signed out', async () => {
      vi.mocked(importExport.exportData).mockResolvedValue()
      renderWithSync(syncValue())
      openSettings()
      fireEvent.click(screen.getByText(/^export$|^exportar$/i))
      expect(await screen.findByText(/sync with google so you don't need to export|sincronize com o google para não precisar exportar/i)).toBeTruthy()
    })

    it('exports shared lists without their sharing data', async () => {
      const sharedList: List = {
        id: 'S', name: 'Bar', type: 'bar', currency: 'BRL', taxPercentage: 0, items: [], sections: [], archived: false,
        shared: { ownerUid: 'u1', inviteToken: 't' },
      }
      mockUseLists.lists = [sharedList]
      vi.mocked(importExport.exportData).mockResolvedValue()
      renderWithSync(syncValue({ status: 'idle' }))
      openSettings()
      fireEvent.click(screen.getByText(/^export$|^exportar$/i))
      mockUseLists.lists = []
      expect(vi.mocked(importExport.exportData).mock.lastCall![0].lists[0].shared).toBeUndefined()
    })

    it('importing keeps local shared lists', async () => {
      const sharedList: List = {
        id: 'S', name: 'Bar', type: 'bar', currency: 'BRL', taxPercentage: 0, items: [], sections: [], archived: false,
        shared: { ownerUid: 'u1', inviteToken: 't' },
      }
      mockUseLists.lists = [sharedList]
      vi.mocked(importExport.importData).mockResolvedValue({ lists: [] })
      const setItem = vi.spyOn(Storage.prototype, 'setItem')
      const reload = vi.fn()
      vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload } as Location)
      const { container } = renderWithSync(syncValue())
      const input = container.querySelector('input[type="file"]') as HTMLInputElement
      await act(async () => {
        fireEvent.change(input, { target: { files: [new File(['{}'], 'b.json', { type: 'application/json' })] } })
      })
      mockUseLists.lists = []
      const saved = setItem.mock.calls.find(([k]) => k === 'app')!
      expect(JSON.parse(saved[1]).lists.map((l: List) => l.id)).toEqual(['S'])
    })

    it('asks for confirmation before importing while signed in', async () => {
      vi.mocked(importExport.importData).mockResolvedValue({ lists: [] })
      const setItem = vi.spyOn(Storage.prototype, 'setItem')
      const { container } = renderWithSync(syncValue({ status: 'idle' }))
      const input = container.querySelector('input[type="file"]') as HTMLInputElement
      await act(async () => {
        fireEvent.change(input, { target: { files: [new File(['{}'], 'b.json', { type: 'application/json' })] } })
      })
      expect(await screen.findByText(/will be sent to the cloud|serão enviadas para a nuvem/i)).toBeTruthy()
      expect(setItem).not.toHaveBeenCalledWith('app', expect.anything())
    })
  })
})
