import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react'
import { DarkModeProvider, useDarkMode } from './DarkModeContext'

const Probe = () => {
  const { mode, isDark, setMode } = useDarkMode()
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="dark">{String(isDark)}</span>
      <button onClick={() => setMode('light')}>light</button>
    </div>
  )
}

let systemDark = false
let listeners: ((e: { matches: boolean }) => void)[] = []

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  systemDark = false
  listeners = []
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: systemDark,
    media: query,
    addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => listeners.push(cb),
    removeEventListener: vi.fn(),
  }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const renderProbe = () => render(<DarkModeProvider><Probe /></DarkModeProvider>)

describe('DarkModeContext', () => {
  it('defaults to following the system appearance', () => {
    systemDark = true
    renderProbe()
    expect(screen.getByTestId('mode').textContent).toBe('system')
    expect(screen.getByTestId('dark').textContent).toBe('true')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('reacts when the system appearance changes', () => {
    renderProbe()
    expect(screen.getByTestId('dark').textContent).toBe('false')
    act(() => listeners.forEach(cb => cb({ matches: true })))
    expect(screen.getByTestId('dark').textContent).toBe('true')
  })

  it('migrates the legacy darkMode=true flag to an explicit dark preference', () => {
    localStorage.setItem('darkMode', 'true')
    renderProbe()
    expect(screen.getByTestId('mode').textContent).toBe('dark')
  })

  it('treats the legacy darkMode=false flag as no preference', () => {
    localStorage.setItem('darkMode', 'false')
    systemDark = true
    renderProbe()
    expect(screen.getByTestId('mode').textContent).toBe('system')
  })

  it('persists an explicit choice over the system setting', () => {
    systemDark = true
    renderProbe()
    fireEvent.click(screen.getByText('light'))
    expect(localStorage.getItem('theme')).toBe('light')
    expect(screen.getByTestId('dark').textContent).toBe('false')
  })
})
