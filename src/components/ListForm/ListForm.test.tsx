import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ListForm } from './ListForm'
import { LanguageProvider } from '../../contexts/LanguageContext'
import * as useListsModule from '../../hooks/useLists'
import type { List } from '../../types'
import { SyncContext, type SyncContextValue } from '../../contexts/SyncContext'

const routeParams = vi.hoisted(() => ({ current: {} as Record<string, string> }))

vi.mock('../../hooks/useLists')
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => routeParams.current,
  }
})

describe('ListForm', () => {
  const mockUseLists = {
    lists: [] as List[],
    createList: vi.fn(),
    createSharedList: vi.fn(() => 'new-id'),
    addMemberPerson: vi.fn(),
    updateList: vi.fn(),
    deleteList: vi.fn(),
    archiveList: vi.fn(),
    unarchiveList: vi.fn(),
    duplicateList: vi.fn(),
    saveAsTemplate: vi.fn(),
    createFromTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    createFromPreset: vi.fn(),
    copyPresetToTemplates: vi.fn(),
    addPerson: vi.fn(),
    removePerson: vi.fn(),
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
    cleanup()
    vi.clearAllMocks()
    vi.spyOn(useListsModule, 'useLists').mockReturnValue(mockUseLists)
  })

  afterEach(cleanup)

  const renderForm = () => {
    return render(
      <BrowserRouter>
        <LanguageProvider><ListForm /></LanguageProvider>
      </BrowserRouter>
    )
  }

  it('renders create form with empty fields', () => {
    renderForm()
    expect(screen.getAllByText('Create List').length).toBeGreaterThan(0)
    expect(screen.getByPlaceholderText('e.g., Weekly Groceries')).toBeDefined()
  })

  it('shows error when submitting empty name', () => {
    const { container } = renderForm()
    fireEvent.submit(container.querySelector('form')!)
    expect(screen.getByText('Name is required')).toBeDefined()
  })

  it('shows error for negative tax percentage', () => {
    const { container } = renderForm()
    const nameInput = screen.getByPlaceholderText('e.g., Weekly Groceries')
    const taxInput = screen.getByPlaceholderText('0')

    fireEvent.change(nameInput, { target: { value: 'Test List' } })
    fireEvent.change(taxInput, { target: { value: '-5' } })
    fireEvent.submit(container.querySelector('form')!)

    expect(screen.getByText('Tax percentage must be 0 or greater')).toBeDefined()
  })

  it('calls createList with valid data', () => {
    const { container } = renderForm()
    const nameInput = screen.getByPlaceholderText('e.g., Weekly Groceries')

    fireEvent.change(nameInput, { target: { value: 'My List' } })
    fireEvent.submit(container.querySelector('form')!)

    expect(mockUseLists.createList).toHaveBeenCalledWith({
      name: 'My List',
      type: 'shopping',
      currency: 'USD',
      taxPercentage: 0,
    })
  })

  it('allows selecting restaurant type via dropdown', () => {
    const { container } = renderForm()
    const select = container.querySelector('select#list-type')!
    fireEvent.change(select, { target: { value: 'restaurant' } })

    const nameInput = screen.getByPlaceholderText('e.g., Weekly Groceries')
    fireEvent.change(nameInput, { target: { value: 'Dinner' } })
    fireEvent.submit(container.querySelector('form')!)

    expect(mockUseLists.createList).toHaveBeenCalledWith({
      name: 'Dinner',
      type: 'restaurant',
      currency: 'USD',
      taxPercentage: 0,
    })
  })

  it('allows selecting bar type via dropdown', () => {
    const { container } = renderForm()
    const select = container.querySelector('select#list-type')!
    fireEvent.change(select, { target: { value: 'bar' } })

    const nameInput = screen.getByPlaceholderText('e.g., Weekly Groceries')
    fireEvent.change(nameInput, { target: { value: 'Friday Night' } })
    fireEvent.submit(container.querySelector('form')!)

    expect(mockUseLists.createList).toHaveBeenCalledWith({
      name: 'Friday Night',
      type: 'bar',
      currency: 'USD',
      taxPercentage: 0,
    })
  })

  it('accepts a comma decimal tax percentage', () => {
    const { container } = renderForm()
    fireEvent.change(screen.getByPlaceholderText('e.g., Weekly Groceries'), { target: { value: 'Dinner' } })
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '10,5' } })
    fireEvent.submit(container.querySelector('form')!)

    expect(mockUseLists.createList).toHaveBeenCalledWith(expect.objectContaining({ taxPercentage: 10.5 }))
  })

  it('uses a decimal keypad for the tax percentage', () => {
    renderForm()
    const taxInput = screen.getByPlaceholderText('0')
    expect(taxInput.getAttribute('type')).toBe('text')
    expect(taxInput.getAttribute('inputmode')).toBe('decimal')
  })

  describe('shared list option', () => {
    const syncValue = (over: Partial<SyncContextValue> = {}): SyncContextValue => ({
      status: 'idle', errorKind: null, lastSyncedAt: null, uid: 'u1', backend: null,
      prepare: vi.fn(), signIn: vi.fn(async () => {}), signOut: vi.fn(async () => {}), syncNow: vi.fn(),
      ...over,
    })
    const renderWithSync = (v: SyncContextValue) => render(
      <BrowserRouter><LanguageProvider><SyncContext.Provider value={v}><ListForm /></SyncContext.Provider></LanguageProvider></BrowserRouter>,
    )
    const sharedBox = () => screen.queryByRole('checkbox', { name: 'Shared list' })

    beforeEach(() => { localStorage.clear(); routeParams.current = {} })

    it('is hidden when sync is not configured', () => {
      renderForm()
      expect(sharedBox()).toBeNull()
    })

    it('is hidden when editing a list', () => {
      routeParams.current = { id: '1' }
      renderWithSync(syncValue())
      expect(sharedBox()).toBeNull()
    })

    it('is disabled when signed out and offers sign-in', () => {
      const v = syncValue({ status: 'signedOut', uid: null })
      renderWithSync(v)
      expect((sharedBox() as HTMLInputElement).disabled).toBe(true)
      fireEvent.click(screen.getByText('Sign in with Google to share'))
      expect(v.signIn).toHaveBeenCalled()
    })

    it('requires your name', () => {
      const { container } = renderWithSync(syncValue())
      fireEvent.change(screen.getByPlaceholderText('e.g., Weekly Groceries'), { target: { value: 'Bar' } })
      fireEvent.click(sharedBox()!)
      fireEvent.submit(container.querySelector('form')!)
      expect(screen.getByText('Enter your name')).toBeDefined()
      expect(mockUseLists.createSharedList).not.toHaveBeenCalled()
    })

    it('creates a shared list owned by you and remembers your name', () => {
      const { container } = renderWithSync(syncValue())
      fireEvent.change(screen.getByPlaceholderText('e.g., Weekly Groceries'), { target: { value: 'Bar' } })
      fireEvent.click(sharedBox()!)
      fireEvent.change(screen.getByLabelText(/Your name in this list/), { target: { value: ' Ana ' } })
      fireEvent.submit(container.querySelector('form')!)
      expect(mockUseLists.createSharedList).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Bar', taxPercentage: 0 }), { uid: 'u1', name: 'Ana' },
      )
      expect(mockUseLists.createList).not.toHaveBeenCalled()
      expect(localStorage.getItem('shared-name')).toBe('Ana')
    })

    it('prefills your name from the last one used', () => {
      localStorage.setItem('shared-name', 'Ana')
      renderWithSync(syncValue())
      fireEvent.click(sharedBox()!)
      expect((screen.getByLabelText(/Your name in this list/) as HTMLInputElement).value).toBe('Ana')
    })
  })
})
