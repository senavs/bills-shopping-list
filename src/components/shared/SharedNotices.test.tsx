import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { SharedNotices } from './SharedNotices'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { SharedSyncContext, type SharedSyncValue } from '../../contexts/SharedSyncContext'

const value = (over: Partial<SharedSyncValue> = {}): SharedSyncValue => ({
  status: 'idle', roleOf: () => null, isPendingCreate: () => false, joinList: vi.fn(),
  leaveList: vi.fn(), deleteSharedList: vi.fn(), notices: [], dismissNotice: vi.fn(), ...over,
})

const renderNotices = (v: SharedSyncValue) => render(
  <LanguageProvider><SharedSyncContext.Provider value={v}><SharedNotices /></SharedSyncContext.Provider></LanguageProvider>,
)

afterEach(cleanup)

describe('SharedNotices', () => {
  it('renders nothing without notices', () => {
    const { container } = renderNotices(value())
    expect(container.textContent).toBe('')
  })

  it('names the list and can be dismissed', () => {
    const v = value({ notices: [
      { id: 'n1', kind: 'deleted', listName: 'Bar' },
      { id: 'n2', kind: 'removed', listName: 'Pub' },
    ] })
    renderNotices(v)
    expect(screen.getByText('"Bar" was deleted by its owner')).toBeDefined()
    expect(screen.getByText('You no longer have access to "Pub"')).toBeDefined()
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0])
    expect(v.dismissNotice).toHaveBeenCalledWith('n1')
  })
})
