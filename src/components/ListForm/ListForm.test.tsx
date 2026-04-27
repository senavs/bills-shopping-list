import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ListForm } from './ListForm'
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
    duplicateList: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(useListsModule, 'useLists').mockReturnValue(mockUseLists)
  })

  const renderForm = () => {
    return render(
      <BrowserRouter>
        <ListForm />
      </BrowserRouter>
    )
  }

  it('renders create form with empty fields', () => {
    renderForm()
    expect(screen.getByText('Create List')).toBeDefined()
    expect(screen.getByPlaceholderText('e.g., Weekly Groceries')).toBeDefined()
  })

  it('shows error when submitting empty name', () => {
    renderForm()
    const submitBtn = screen.getByText('Create List')
    fireEvent.click(submitBtn)
    expect(screen.getByText('Name is required')).toBeDefined()
  })

  it('shows error for negative tax percentage', () => {
    renderForm()
    const nameInput = screen.getByPlaceholderText('e.g., Weekly Groceries')
    const taxInput = screen.getByPlaceholderText('0')
    const submitBtn = screen.getByText('Create List')

    fireEvent.change(nameInput, { target: { value: 'Test List' } })
    fireEvent.change(taxInput, { target: { value: '-5' } })
    fireEvent.click(submitBtn)

    expect(screen.getByText('Tax percentage must be 0 or greater')).toBeDefined()
  })

  it('calls createList with valid data', () => {
    renderForm()
    const nameInput = screen.getByPlaceholderText('e.g., Weekly Groceries')
    const submitBtn = screen.getByText('Create List')

    fireEvent.change(nameInput, { target: { value: 'My List' } })
    fireEvent.click(submitBtn)

    expect(mockUseLists.createList).toHaveBeenCalledWith({
      name: 'My List',
      type: 'shopping',
      currency: 'USD',
      taxPercentage: 0,
    })
  })

  it('allows selecting restaurant type', () => {
    renderForm()
    const restaurantRadio = screen.getByLabelText(/Restaurant/)
    fireEvent.click(restaurantRadio)
    expect(restaurantRadio).toHaveProperty('checked', true)
  })
})
