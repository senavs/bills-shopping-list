import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { JoinPage } from './JoinPage'
import { ListsProvider, useLists } from '../../contexts/ListsContext'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { SyncContext, type SyncContextValue } from '../../contexts/SyncContext'
import { SharedSyncContext, type SharedSyncValue } from '../../contexts/SharedSyncContext'
import type { List } from '../../types'

const list = (memberPeople: Record<string, string>): List => ({
  id: 'L1', name: 'Bar', type: 'bar', currency: 'BRL', taxPercentage: 0, items: [], sections: [], archived: false,
  people: [{ id: 'p1', name: 'Ana' }],
  shared: { ownerUid: 'u1', inviteToken: 'T', memberPeople },
})

const syncValue = (over: Partial<SyncContextValue> = {}): SyncContextValue => ({
  status: 'idle', errorKind: null, lastSyncedAt: null, uid: 'u2', backend: null,
  prepare: vi.fn(), signIn: vi.fn(async () => {}), signOut: vi.fn(async () => {}), syncNow: vi.fn(),
  ...over,
})

const sharedValue = (joinList: SharedSyncValue['joinList']): SharedSyncValue => ({
  status: 'idle', roleOf: () => null, isPendingCreate: () => false, joinList, leaveList: vi.fn(), deleteSharedList: vi.fn(),
  notices: [], dismissNotice: vi.fn(),
})

let lists: ReturnType<typeof useLists>
const Capture = () => { lists = useLists(); return <p>LIST PAGE</p> }

const renderJoin = (opts: { sync?: SyncContextValue; joinList?: SharedSyncValue['joinList']; local?: List[]; url?: string }) => {
  localStorage.setItem('app', JSON.stringify({ lists: opts.local ?? [] }))
  const joinList = opts.joinList ?? vi.fn(async () => 'ok' as const)
  render(
    <LanguageProvider>
      <ListsProvider>
        <SyncContext.Provider value={opts.sync ?? syncValue()}>
          <SharedSyncContext.Provider value={sharedValue(joinList)}>
            <MemoryRouter initialEntries={[opts.url ?? '/join/L1?t=T']}>
              <Routes>
                <Route path="/join/:listId" element={<JoinPage />} />
                <Route path="/lists/:id" element={<Capture />} />
              </Routes>
            </MemoryRouter>
          </SharedSyncContext.Provider>
        </SyncContext.Provider>
      </ListsProvider>
    </LanguageProvider>,
  )
  return { joinList }
}

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('JoinPage', () => {
  it('asks to sign in when signed out', () => {
    const sync = syncValue({ status: 'signedOut', uid: null })
    const { joinList } = renderJoin({ sync })
    expect(screen.getByText('You were invited to a shared list')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }))
    expect(sync.signIn).toHaveBeenCalled()
    expect(joinList).not.toHaveBeenCalled()
  })

  it('without a token the invite is invalid', () => {
    renderJoin({ url: '/join/L1' })
    expect(screen.getByText('Invalid or expired invite')).toBeDefined()
  })

  it('a refused invite is invalid', async () => {
    const { joinList } = renderJoin({ joinList: vi.fn(async () => 'invalid' as const) })
    expect(await screen.findByText('Invalid or expired invite')).toBeDefined()
    expect(joinList).toHaveBeenCalledWith('L1', 'T')
  })

  it('a network error offers to try again', async () => {
    const joinList = vi.fn(async () => 'network' as const)
    renderJoin({ joinList })
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(joinList).toHaveBeenCalledTimes(2)
  })

  it('after joining asks your name, links you and opens the list', async () => {
    localStorage.setItem('shared-name', 'Bia')
    renderJoin({ local: [list({ u1: 'p1' })] })
    const input = await screen.findByLabelText(/Your name in this list/)
    expect((input as HTMLInputElement).value).toBe('Bia')
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Continue' })) })
    expect(screen.getByText('LIST PAGE')).toBeDefined()
    const joined = lists.lists.find(l => l.id === 'L1')!
    const bia = joined.people!.find(p => p.name === 'Bia')!
    expect(joined.shared!.memberPeople!.u2).toBe(bia.id)
  })

  it('requires a name', async () => {
    renderJoin({ local: [list({ u1: 'p1' })] })
    await screen.findByLabelText(/Your name in this list/)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Continue' })) })
    expect(screen.getByText('Enter your name')).toBeDefined()
  })

  it('an already linked member goes straight to the list', async () => {
    const { joinList } = renderJoin({ local: [list({ u1: 'p1', u2: 'p2' })] })
    expect(await screen.findByText('LIST PAGE')).toBeDefined()
    expect(joinList).not.toHaveBeenCalled()
  })
})
