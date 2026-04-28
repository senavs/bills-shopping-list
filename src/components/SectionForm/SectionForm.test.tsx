import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { SectionForm } from './SectionForm'

afterEach(cleanup)

describe('SectionForm', () => {
  it('renders with empty name by default', () => {
    render(<SectionForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    const input = screen.getByPlaceholderText('Section name') as HTMLInputElement
    expect(input.value).toBe('')
    expect(screen.getByText('New Section')).toBeDefined()
  })

  it('renders with initialName pre-filled', () => {
    render(<SectionForm initialName="Dairy" onSubmit={vi.fn()} onCancel={vi.fn()} />)
    const input = screen.getByPlaceholderText('Section name') as HTMLInputElement
    expect(input.value).toBe('Dairy')
    expect(screen.getByText('Rename Section')).toBeDefined()
  })

  it('shows error on empty submit', () => {
    render(<SectionForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByText('Create'))
    expect(screen.getByText('Name is required')).toBeDefined()
  })

  it('calls onSubmit with trimmed name', () => {
    const onSubmit = vi.fn()
    render(<SectionForm onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('Section name'), { target: { value: '  Dairy  ' } })
    fireEvent.click(screen.getByText('Create'))
    expect(onSubmit).toHaveBeenCalledWith('Dairy')
  })

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn()
    render(<SectionForm onSubmit={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })
})
