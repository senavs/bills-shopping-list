import { useState, useEffect } from 'react'

export type DisplayMode = 'standalone' | 'browser'

/**
 * Hook that detects whether the app is running in standalone PWA mode
 * (installed on home screen) or in a normal browser tab.
 *
 * Checks:
 * - CSS media query `(display-mode: standalone)`
 * - `navigator.standalone` (iOS Safari specific)
 *
 * Listens for changes via the MediaQueryList `change` event.
 */
export function useDisplayMode(): DisplayMode {
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    if (typeof window === 'undefined') return 'browser'

    // iOS Safari standalone check
    if ((navigator as { standalone?: boolean }).standalone === true) {
      return 'standalone'
    }

    // Standard display-mode media query
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return 'standalone'
    }

    return 'browser'
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)')

    const handleChange = (e: MediaQueryListEvent) => {
      setDisplayMode(e.matches ? 'standalone' : 'browser')
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return displayMode
}
