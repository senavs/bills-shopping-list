import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'

interface DarkModeContextType {
  /** The user's preference */
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  /** Whether dark styles are applied right now (resolves "system") */
  isDark: boolean
}

const STORAGE_KEY = 'theme'
/** Status bar / browser chrome colors; keep in sync with --bg in index.css and index.html */
const THEME_COLORS = { light: '#F2F2F7', dark: '#000000' }

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined)

const readMode = (): ThemeMode => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'system' || saved === 'light' || saved === 'dark') return saved
    // Legacy boolean flag: it was written on every visit, so only "true" was a real choice
    if (localStorage.getItem('darkMode') === 'true') return 'dark'
  } catch {
    // Storage unavailable (private mode); fall back to the system setting
  }
  return 'system'
}

const systemQuery = () =>
  typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null

export const DarkModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<ThemeMode>(readMode)
  const [systemDark, setSystemDark] = useState(() => systemQuery()?.matches ?? false)

  // Follow the OS appearance (e.g. iOS automatic light/dark at sunset)
  useEffect(() => {
    const query = systemQuery()
    if (!query) return
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    query.addEventListener?.('change', onChange)
    return () => query.removeEventListener?.('change', onChange)
  }, [])

  const isDark = mode === 'dark' || (mode === 'system' && systemDark)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', isDark)
    root.style.colorScheme = isDark ? 'dark' : 'light'
    // Keep the iOS status bar in step with an in-app override of the system theme
    document
      .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach(meta => meta.setAttribute('content', isDark ? THEME_COLORS.dark : THEME_COLORS.light))
  }, [isDark])

  const setMode = (next: ThemeMode) => {
    setModeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
      localStorage.removeItem('darkMode')
    } catch {
      // Preference just won't persist
    }
  }

  return (
    <DarkModeContext.Provider value={{ mode, setMode, isDark }}>
      {children}
    </DarkModeContext.Provider>
  )
}

export const useDarkMode = () => {
  const context = useContext(DarkModeContext)
  if (!context) {
    throw new Error('useDarkMode must be used within DarkModeProvider')
  }
  return context
}
