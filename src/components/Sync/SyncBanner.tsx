import { useState } from 'react'
import { useSync } from '../../contexts/SyncContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { CloudIcon } from '../shared/icons'

const DISMISSED_KEY = 'sync-banner-dismissed'
const MIN_LISTS = 3

const readDismissed = () => {
  try { return localStorage.getItem(DISMISSED_KEY) === '1' } catch { return false }
}

/** One-time nudge for users with enough data to lose who never signed in. */
export const SyncBanner = ({ listCount }: { listCount: number }) => {
  const { status, signIn, prepare } = useSync()
  const { t } = useLanguage()
  const [dismissed, setDismissed] = useState(readDismissed)

  if (status !== 'signedOut' || listCount < MIN_LISTS || dismissed) return null

  const dismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  return (
    <div className="mb-4 p-4 bg-surface rounded-group flex gap-3 items-start">
      <CloudIcon className="w-6 h-6 text-accent shrink-0" />
      <div className="flex-1">
        <p className="text-body font-semibold text-ink">{t.syncBannerTitle}</p>
        <p className="text-footnote text-muted">{t.syncBannerBody}</p>
        <div className="mt-2 flex gap-4">
          {/* Preload on press so the SDK is ready by click and the popup keeps the tap gesture */}
          <button onPointerDown={prepare} onClick={() => { void signIn() }} className="text-callout font-semibold text-accent">{t.syncWithGoogle}</button>
          <button onClick={dismiss} className="text-callout text-muted">{t.notNow}</button>
        </div>
      </div>
    </div>
  )
}
