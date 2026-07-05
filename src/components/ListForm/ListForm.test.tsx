import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ListForm } from './ListForm'
import { LanguageProvider } from '../../contexts/LanguageContext'
import * as useListsModule from '../../hooks/useLists'
import type { List } from '../../types'

vi.mock('../../hooks/useLists')
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({}),
  }
})

describe('ListForm', () => {
  const mockUseLists = {
    lists: [] as List[],
    createList: vi.fn(),
    updateList: vi.fn(),
    deleteList: vi.fn(),
    archiveList: vi.fn(),
    unarchiveList: vi.fn(),
    duplicateList: vi.fn(),
    saveAsTemplate: vi.fn(),
    createFromTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
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
})
