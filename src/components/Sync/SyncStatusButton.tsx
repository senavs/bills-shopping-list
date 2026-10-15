import { useSync } from '../../contexts/SyncContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { CloudAlertIcon, CloudCheckIcon, CloudIcon, CloudOffIcon } from '../shared/icons'

/** Header cloud icon; only shown while signed in. */
export const SyncStatusButton = ({ onOpen }: { onOpen: () => void }) => {
  const { status } = useSync()
  const { t } = useLanguage()
  if (status === 'disabled' || status === 'signedOut') return null

  const { label, icon } = {
    idle: { label: t.syncStatusIdle, icon: <CloudCheckIcon className="w-6 h-6" /> },
    syncing: { label: t.syncStatusSyncing, icon: <CloudIcon className="w-6 h-6 animate-pulse" /> },
    offline: { label: t.syncStatusOffline, icon: <CloudOffIcon className="w-6 h-6" /> },
    error: { label: t.syncStatusError, icon: <CloudAlertIcon className="w-6 h-6 text-danger" /> },
  }[status]

  return (
    <button
      onClick={onOpen}
      className="w-11 h-11 flex items-center justify-center rounded-full bg-fill text-accent"
      aria-label={label}
    >
      {icon}
    </button>
  )
}
