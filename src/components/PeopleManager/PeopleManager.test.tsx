import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { PeopleManager } from './PeopleManager'
import { LanguageProvider } from '../../contexts/LanguageContext'

const people = [{ id: 'p1', name: 'Ana' }, { id: 'p2', name: 'Bia' }, { id: 'p3', name: 'Caio' }]

const renderManager = (shared?: Parameters<typeof PeopleManager>[0]['shared']) => {
  const onRemovePerson = vi.fn()
  render(
    <LanguageProvider>
      <PeopleManager people={people} onAddPerson={vi.fn()} onRemovePerson={onRemovePerson} shared={shared} />
    </LanguageProvider>,
  )
  fireEvent.click(screen.getByRole('button', { expanded: false }))
  return { onRemovePerson }
}

afterEach(cleanup)

describe('PeopleManager', () => {
  it('private lists keep the current behavior', () => {
    renderManager()
    expect(screen.getByText('People')).toBeDefined()
    expect(screen.queryByText('Invite more')).toBeNull()
    expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(3)
  })

  describe('shared lists', () => {
    const shared = (over = {}) => ({ myPersonId: 'p1', memberPersonIds: ['p1', 'p2'], onInvite: vi.fn(), inviteDisabled: false, ...over })

    it('shows people & members, marks you and members, and members cannot be removed', () => {
      const { onRemovePerson } = renderManager(shared())
      expect(screen.getByText('People & members')).toBeDefined()
      expect(screen.getByText('you')).toBeDefined()
      expect(screen.getAllByLabelText('Using the app')).toHaveLength(2)
      const remove = screen.getAllByRole('button', { name: /remove/i })
      expect(remove).toHaveLength(1)
      fireEvent.click(remove[0])
      expect(onRemovePerson).toHaveBeenCalledWith('p3')
    })

    it('invite more calls onInvite', () => {
      const s = shared()
      renderManager(s)
      fireEvent.click(screen.getByRole('button', { name: 'Invite more' }))
      expect(s.onInvite).toHaveBeenCalled()
    })

    it('invite is disabled while waiting for the connection', () => {
      renderManager(shared({ inviteDisabled: true }))
      expect((screen.getByRole('button', { name: 'Invite more' }) as HTMLButtonElement).disabled).toBe(true)
      expect(screen.getByText('Waiting for connection')).toBeDefined()
    })
  })
})
