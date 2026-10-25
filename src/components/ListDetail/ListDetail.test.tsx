import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ListDetail } from './ListDetail'
import { ListsProvider } from '../../contexts/ListsContext'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { SyncContext, type SyncContextValue } from '../../contexts/SyncContext'
import type { List } from '../../types'

const sharedList: List = {
  id: 'L1', name: 'Bar', type: 'bar', currency: 'BRL', taxPercentage: 0, items: [], sections: [], archived: false,
  people: [{ id: 'p1', name: 'Ana' }],
  shared: { ownerUid: 'u1', inviteToken: 'TOKEN', memberPeople: { u1: 'p1' } },
}

const syncValue = (over: Partial<SyncContextValue> = {}): SyncContextValue => ({
  status: 'idle', errorKind: null, lastSyncedAt: null, uid: 'u1', backend: null,
  prepare: vi.fn(), signIn: vi.fn(async () => {}), signOut: vi.fn(async () => {}), syncNow: vi.fn(),
  ...over,
})

const renderDetail = (v: SyncContextValue, list: List = sharedList) => {
  localStorage.setItem('app', JSON.stringify({ lists: [list] }))
  return render(
    <LanguageProvider>
      <ListsProvider>
        <SyncContext.Provider value={v}>
          <MemoryRouter initialEntries={[`/lists/${list.id}`]}>
            <Routes><Route path="/lists/:id" element={<ListDetail />} /></Routes>
          </MemoryRouter>
        </SyncContext.Provider>
      </ListsProvider>
    </LanguageProvider>,
  )
}

beforeEach(() => localStorage.clear())
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('ListDetail with a shared list', () => {
  it('the invite shortcut shares the join link', async () => {
    const share = vi.fn(async () => {})
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    renderDetail(syncValue())
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Invite' })) })
    expect(share).toHaveBeenCalledWith({
      text: 'Join my list "Bar" on BillBuddy',
      url: expect.stringMatching(/#\/join\/L1\?t=TOKEN$/),
    })
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
  })

  it('shows the people & members panel', () => {
    renderDetail(syncValue())
    fireEvent.click(screen.getByText('People & members'))
    expect(screen.getByText('you')).toBeDefined()
  })

  it('a member without a person is asked for their name', async () => {
    renderDetail(syncValue({ uid: 'u2' }))
    fireEvent.change(screen.getByLabelText(/Your name in this list/), { target: { value: 'Bia' } })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Continue' })) })
    expect(screen.queryByLabelText(/Your name in this list/)).toBeNull()
    fireEvent.click(screen.getByText('People & members'))
    expect(screen.getByText('Bia')).toBeDefined()
    expect(screen.getByText('you')).toBeDefined()
  })

  it('a linked member is not asked for a name', () => {
    renderDetail(syncValue())
    expect(screen.queryByLabelText(/Your name in this list/)).toBeNull()
  })

  it('asks to sign in when signed out', () => {
    renderDetail(syncValue({ status: 'signedOut', uid: null }))
    expect(screen.getByText('Sign in to sync this shared list')).toBeDefined()
  })

  it('private lists have no invite', () => {
    const { shared: _s, ...priv } = sharedList
    renderDetail(syncValue(), priv)
    expect(screen.queryByRole('button', { name: 'Invite' })).toBeNull()
  })
})
