import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { SyncContext, type SyncContextValue } from '../../contexts/SyncContext'
import { SyncStatusButton } from './SyncStatusButton'
import { AccountSheet } from './AccountSheet'

const value = (over: Partial<SyncContextValue> = {}): SyncContextValue => ({
  status: 'idle', errorKind: null, lastSyncedAt: null,
  prepare: vi.fn(), signIn: vi.fn(async () => {}), signOut: vi.fn(async () => {}), syncNow: vi.fn(),
  ...over,
})

const wrap = (ui: React.ReactNode, v: SyncContextValue) => {
  localStorage.setItem('locale', 'en')
  return render(<LanguageProvider><SyncContext.Provider value={v}>{ui}</SyncContext.Provider></LanguageProvider>)
}

afterEach(() => cleanup())

describe('SyncStatusButton', () => {
  it.each(['disabled', 'signedOut'] as const)('renders nothing when %s', status => {
    wrap(<SyncStatusButton onOpen={() => {}} />, value({ status }))
    expect(screen.queryByRole('button')).toBeNull()
  })

  it.each([
    ['idle', 'Synced'],
    ['syncing', 'Syncing…'],
    ['offline', 'Offline — changes saved on this device'],
    ['error', 'Sync failed'],
  ] as const)('shows %s status as accessible label', (status, label) => {
    const onOpen = vi.fn()
    wrap(<SyncStatusButton onOpen={onOpen} />, value({ status }))
    fireEvent.click(screen.getByRole('button', { name: label }))
    expect(onOpen).toHaveBeenCalled()
  })
})

describe('AccountSheet', () => {
  it('offers sync now and sign out, with no personal data', () => {
    const v = value()
    wrap(<AccountSheet isOpen onClose={() => {}} />, v)
    expect(screen.getByText('Your lists stay on this device.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sync now' }))
    expect(v.syncNow).toHaveBeenCalled()
  })

  it('offers sign in again on auth error', () => {
    const v = value({ status: 'error', errorKind: 'auth' })
    wrap(<AccountSheet isOpen onClose={() => {}} />, v)
    fireEvent.click(screen.getByRole('button', { name: 'Sign in again' }))
    expect(v.signIn).toHaveBeenCalled()
  })

  it('signs out', () => {
    const v = value()
    wrap(<AccountSheet isOpen onClose={() => {}} />, v)
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(v.signOut).toHaveBeenCalled()
  })
})
