import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'

/** Hook that adds 'revealed' class to children with 'reveal' class when they enter viewport */
const useScrollReveal = () => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
          }
        })
      },
      { threshold: 0.15 }
    )

    const elements = container.querySelectorAll('.reveal')
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return containerRef
}

export const Landing = () => {
  const { t, locale, setLocale } = useLanguage()
  const navigate = useNavigate()
  const containerRef = useScrollReveal()

  const handleGetStarted = () => {
    localStorage.setItem('billbuddy_visited', 'true')
    navigate('/app')
  }

  return (
    <div ref={containerRef} className="min-h-dvh bg-[#164F3A] text-white overflow-y-auto pt-safe">
      {/* Language toggle - top right */}
      <div className="fixed top-safe right-safe z-50">
        <button
          onClick={() => setLocale(locale === 'en' ? 'pt-BR' : 'en')}
          className="w-12 h-12 bg-white bg-opacity-20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl hover:bg-opacity-30 transition-all shadow-lg"
          title={locale === 'en' ? 'Mudar para Português' : 'Switch to English'}
        >
          {locale === 'pt-BR' ? '🇧🇷' : '🇺🇸'}
        </button>
      </div>

      {/* Hero Section */}
      <section className="min-h-dvh flex flex-col items-center justify-center px-6 text-center relative">
        <div className="text-6xl mb-6 animate-bounce-slow">
          💰📋📱
        </div>
        <h1 className="text-5xl font-extrabold mb-4 tracking-tight">
          BillBuddy
        </h1>
        <p className="text-xl text-white/80 mb-8 max-w-md leading-relaxed">
          {t.landingTagline}
        </p>
        <button
          onClick={handleGetStarted}
          className="px-8 py-4 bg-tag text-on-tag font-bold rounded-full text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
        >
          {t.landingCta} →
        </button>
        <div className="absolute bottom-8 text-white/70 animate-bounce text-2xl">
          ↓
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-surface text-ink">
        <div className="max-w-4xl mx-auto">
          <h2 className="reveal text-3xl font-bold text-center mb-12">
            {t.landingWhyTitle}
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="reveal reveal-delay-1 bg-bg rounded-2xl p-6 text-center shadow-sm">
              <div className="text-4xl mb-3">📋</div>
              <h3 className="font-bold text-lg mb-2">{t.landingFeature1Title}</h3>
              <p className="text-sm text-muted">{t.landingFeature1Desc}</p>
            </div>
            <div className="reveal reveal-delay-2 bg-bg rounded-2xl p-6 text-center shadow-sm">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="font-bold text-lg mb-2">{t.landingFeature2Title}</h3>
              <p className="text-sm text-muted">{t.landingFeature2Desc}</p>
            </div>
            <div className="reveal reveal-delay-3 bg-bg rounded-2xl p-6 text-center shadow-sm">
              <div className="text-4xl mb-3">🌐</div>
              <h3 className="font-bold text-lg mb-2">{t.landingFeature3Title}</h3>
              <p className="text-sm text-muted">{t.landingFeature3Desc}</p>
            </div>
            <div className="reveal reveal-delay-4 bg-bg rounded-2xl p-6 text-center shadow-sm">
              <div className="text-4xl mb-3">📱</div>
              <h3 className="font-bold text-lg mb-2">{t.landingFeature4Title}</h3>
              <p className="text-sm text-muted">{t.landingFeature4Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-20 px-6 bg-bg text-ink">
        <div className="max-w-md mx-auto">
          <h2 className="reveal text-3xl font-bold text-center mb-12">
            {t.landingHowTitle}
          </h2>
          <div className="space-y-8">
            <div className="reveal reveal-delay-1 flex items-start gap-4">
              <div className="w-10 h-10 bg-accent text-on-accent rounded-full flex items-center justify-center font-bold shrink-0">
                1
              </div>
              <div>
                <h3 className="font-bold text-lg">{t.landingStep1Title}</h3>
                <p className="text-muted text-sm">{t.landingStep1Desc}</p>
              </div>
            </div>
            <div className="reveal reveal-delay-2 flex items-start gap-4">
              <div className="w-10 h-10 bg-accent text-on-accent rounded-full flex items-center justify-center font-bold shrink-0">
                2
              </div>
              <div>
                <h3 className="font-bold text-lg">{t.landingStep2Title}</h3>
                <p className="text-muted text-sm">{t.landingStep2Desc}</p>
              </div>
            </div>
            <div className="reveal reveal-delay-3 flex items-start gap-4">
              <div className="w-10 h-10 bg-accent text-on-accent rounded-full flex items-center justify-center font-bold shrink-0">
                3
              </div>
              <div>
                <h3 className="font-bold text-lg">{t.landingStep3Title}</h3>
                <p className="text-muted text-sm">{t.landingStep3Desc}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-6 bg-[#164F3A] text-white text-center">
        <h2 className="reveal text-3xl font-bold mb-6">{t.landingReadyTitle}</h2>
        <p className="reveal reveal-delay-1 text-white/80 mb-8 text-lg">{t.landingReadyDesc}</p>
        <button
          onClick={handleGetStarted}
          className="reveal reveal-delay-2 px-8 py-4 bg-tag text-on-tag font-bold rounded-full text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
        >
          {t.landingOpenApp} →
        </button>
        <p className="reveal reveal-delay-3 mt-12 text-white/70 text-sm">
          {t.landingMadeWith}
        </p>
      </section>
    </div>
  )
}
