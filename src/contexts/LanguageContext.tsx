import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { en } from '../i18n/en'
import { ptBR } from '../i18n/ptBR'
import type { TranslationKeys } from '../i18n/en'

type Locale = 'en' | 'pt-BR'

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: TranslationKeys
  isBR: boolean
}

const translations: Record<Locale, TranslationKeys> = {
  'en': en,
  'pt-BR': ptBR,
}

function detectLocale(): Locale {
  // Check localStorage first (user preference)
  const saved = localStorage.getItem('locale')
  if (saved === 'en' || saved === 'pt-BR') return saved

  // Detect from browser language
  const browserLang = navigator.language || (navigator as any).userLanguage || ''
  if (browserLang.startsWith('pt')) return 'pt-BR'

  return 'en'
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(detectLocale)

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('locale', newLocale)
  }

  useEffect(() => {
    document.documentElement.lang = locale === 'pt-BR' ? 'pt-BR' : 'en'
  }, [locale])

  const t = translations[locale]
  const isBR = locale === 'pt-BR'

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, isBR }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}
