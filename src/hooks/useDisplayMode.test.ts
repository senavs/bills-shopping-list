import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDisplayMode } from './useDisplayMode'

describe('useDisplayMode', () => {
  let originalMatchMedia: typeof window.matchMedia
  let changeHandler: ((e: MediaQueryListEvent) => void) | null = null

  const createMockMatchMedia = (matches: boolean) => {
    return vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          changeHandler = handler
        }
      }),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  }

  beforeEach(() => {
    originalMatchMedia = window.matchMedia
    changeHandler = null
    // Reset navigator.standalone
    Object.defineProperty(navigator, 'standalone', {
      value: undefined,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('returns "browser" when not in standalone mode', () => {
    window.matchMedia = createMockMatchMedia(false)

    const { result } = renderHook(() => useDisplayMode())
    expect(result.current).toBe('browser')
  })

  it('returns "standalone" when display-mode media query matches', () => {
    window.matchMedia = createMockMatchMedia(true)

    const { result } = renderHook(() => useDisplayMode())
    expect(result.current).toBe('standalone')
  })

  it('returns "standalone" when navigator.standalone is true (iOS)', () => {
    Object.defineProperty(navigator, 'standalone', {
      value: true,
      writable: true,
      configurable: true,
    })
    window.matchMedia = createMockMatchMedia(false)

    const { result } = renderHook(() => useDisplayMode())
    expect(result.current).toBe('standalone')
  })

  it('updates when media query change event fires', () => {
    window.matchMedia = createMockMatchMedia(false)

    const { result } = renderHook(() => useDisplayMode())
    expect(result.current).toBe('browser')

    // Simulate media query change
    act(() => {
      if (changeHandler) {
        changeHandler({ matches: true } as MediaQueryListEvent)
      }
    })

    expect(result.current).toBe('standalone')
  })

  it('cleans up event listener on unmount', () => {
    const removeEventListener = vi.fn()
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { unmount } = renderHook(() => useDisplayMode())
    unmount()

    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
