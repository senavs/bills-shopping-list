import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { PeopleManager } from './PeopleManager'
import { LanguageProvider } from '../../contexts/LanguageContext'
import type { Item, Person } from '../../types'

const people = [{ id: 'p1', name: 'Ana' }, { id: 'p2', name: 'Bia' }, { id: 'p3', name: 'Caio Prado' }]
const item = (assignedTo: string[]): Item => ({ id: crypto.randomUUID(), name: 'x', quantity: 1, unitPrice: 1, selected: false, includeInTax: true, assignedTo })

const renderManager = (
  shared?: Parameters<typeof PeopleManager>[0]['shared'],
  { list = people, items = [] as Item[] }: { list?: Person[]; items?: Item[] } = {},
) => {
  const onRemovePerson = vi.fn()
  const onAddPerson = vi.fn()
  render(
    <LanguageProvider>
      <PeopleManager people={list} items={items} onAddPerson={onAddPerson} onRemovePerson={onRemovePerson} shared={shared} />
    </LanguageProvider>,
  )
  return { onRemovePerson, onAddPerson }
}

const openModal = () => {
  fireEvent.click(screen.getByRole('button', { name: /people/i }))
  return screen.getByRole('dialog')
}

afterEach(cleanup)

describe('PeopleManager', () => {
  it('the trigger summarizes people and opens the modal', () => {
    renderManager()
    expect(screen.getByText('Ana, Bia, Caio Prado')).toBeDefined()
    expect(screen.queryByRole('dialog')).toBeNull()
    const dialog = openModal()
    expect(within(dialog).getByText('People')).toBeDefined()
    expect(within(dialog).getByText('CP')).toBeDefined()
  })

  it('an empty list invites you to add people', () => {
    renderManager(undefined, { list: [] })
    expect(screen.getByText('Add people')).toBeDefined()
    const dialog = openModal()
    expect(within(dialog).getByText(/Add whoever is splitting the bill/)).toBeDefined()
  })

  it('adds a person and clears the field', () => {
    const { onAddPerson } = renderManager()
    const dialog = openModal()
    const input = within(dialog).getByLabelText('Add person...') as HTMLInputElement
    fireEvent.change(input, { target: { value: '  Duda  ' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }))
    expect(onAddPerson).toHaveBeenCalledWith('Duda')
    expect(input.value).toBe('')
  })

  it('removes someone without items right away', () => {
    const { onRemovePerson } = renderManager()
    const dialog = openModal()
    expect(within(dialog).getAllByRole('button', { name: /^Remove / })).toHaveLength(3)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove Bia' }))
    expect(onRemovePerson).toHaveBeenCalledWith('p2')
  })

  it('asks before removing someone with items, showing their item count', () => {
    const { onRemovePerson } = renderManager(undefined, { items: [item(['p1']), item(['p1', 'p2'])] })
    const dialog = openModal()
    expect(within(dialog).getByText('2 items')).toBeDefined()
    expect(within(dialog).getByText('1 item')).toBeDefined()
    expect(within(dialog).getByText('No items assigned')).toBeDefined()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove Ana' }))
    expect(onRemovePerson).not.toHaveBeenCalled()
    expect(within(dialog).getByText('Items assigned to Ana will be split among everyone.')).toBeDefined()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove Ana?' }))
    expect(onRemovePerson).toHaveBeenCalledWith('p1')
  })

  it('cancel keeps the person', () => {
    const { onRemovePerson } = renderManager(undefined, { items: [item(['p1'])] })
    const dialog = openModal()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove Ana' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(onRemovePerson).not.toHaveBeenCalled()
    expect(within(dialog).getByText('1 item')).toBeDefined()
  })

  it('closes with the close button and with Escape', () => {
    renderManager()
    openModal()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    openModal()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('private lists have no invite', () => {
    renderManager()
    const dialog = openModal()
    expect(within(dialog).queryByRole('button', { name: 'Share invite link' })).toBeNull()
  })

  describe('shared lists', () => {
    const shared = (over = {}) => ({ myPersonId: 'p1', memberPersonIds: ['p1', 'p2'], onInvite: vi.fn(), inviteDisabled: false, ...over })

    it('marks you and members, and members cannot be removed', () => {
      const { onRemovePerson } = renderManager(shared())
      const dialog = openModal()
      expect(within(dialog).getByText('People & members')).toBeDefined()
      expect(within(dialog).getByText('you')).toBeDefined()
      expect(within(dialog).getAllByLabelText('Using the app')).toHaveLength(2)
      const remove = within(dialog).getAllByRole('button', { name: /^Remove / })
      expect(remove).toHaveLength(1)
      fireEvent.click(remove[0])
      expect(onRemovePerson).toHaveBeenCalledWith('p3')
    })

    it('share invite link calls onInvite and shows the notice', () => {
      const s = shared({ notice: 'Invite link copied' })
      renderManager(s)
      const dialog = openModal()
      fireEvent.click(within(dialog).getByRole('button', { name: 'Share invite link' }))
      expect(s.onInvite).toHaveBeenCalled()
      expect(within(dialog).getByRole('status').textContent).toBe('Invite link copied')
    })

    it('invite is disabled while waiting for the connection', () => {
      renderManager(shared({ inviteDisabled: true }))
      const dialog = openModal()
      expect((within(dialog).getByRole('button', { name: 'Share invite link' }) as HTMLButtonElement).disabled).toBe(true)
      expect(within(dialog).getByText('Waiting for connection')).toBeDefined()
    })
  })
})
