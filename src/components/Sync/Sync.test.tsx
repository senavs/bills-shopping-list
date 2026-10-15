import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { SyncContext, type SyncContextValue } from '../../contexts/SyncContext'
import { SyncStatusButton } from './SyncStatusButton'
import { AccountSheet } from './AccountSheet'
import { SyncBanner } from './SyncBanner'

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

describe('SyncBanner', () => {
  beforeEach(() => localStorage.clear())

  it('shows for signed-out users with 3+ lists and signs in', () => {
    const v = value({ status: 'signedOut' })
    wrap(<SyncBanner listCount={3} />, v)
    fireEvent.click(screen.getByRole('button', { name: 'Sync with Google' }))
    expect(v.signIn).toHaveBeenCalled()
  })

  it('preloads the SDK as soon as the sign-in button is pressed (keeps the iOS tap gesture)', () => {
    const v = value({ status: 'signedOut' })
    wrap(<SyncBanner listCount={3} />, v)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Sync with Google' }))
    expect(v.prepare).toHaveBeenCalled()
  })

  it('hides with fewer than 3 lists, when signed in or when disabled', () => {
    const { unmount } = wrap(<SyncBanner listCount={2} />, value({ status: 'signedOut' }))
    expect(screen.queryByText('Keep your lists safe')).toBeNull()
    unmount()
    const r2 = wrap(<SyncBanner listCount={5} />, value({ status: 'idle' }))
    expect(screen.queryByText('Keep your lists safe')).toBeNull()
    r2.unmount()
    wrap(<SyncBanner listCount={5} />, value({ status: 'disabled' }))
    expect(screen.queryByText('Keep your lists safe')).toBeNull()
  })

  it('stays dismissed', () => {
    const { unmount } = wrap(<SyncBanner listCount={3} />, value({ status: 'signedOut' }))
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(screen.queryByText('Keep your lists safe')).toBeNull()
    unmount()
    wrap(<SyncBanner listCount={3} />, value({ status: 'signedOut' }))
    expect(screen.queryByText('Keep your lists safe')).toBeNull()
    expect(localStorage.getItem('sync-banner-dismissed')).toBe('1')
  })
})
