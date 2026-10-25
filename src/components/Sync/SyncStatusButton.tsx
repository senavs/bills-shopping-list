import { useSync } from '../../contexts/SyncContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { useSharedSync } from '../../contexts/SharedSyncContext'
import { combineStatus } from '../../lib/sharedSync/status'
import { CloudAlertIcon, CloudCheckIcon, CloudIcon, CloudOffIcon } from '../shared/icons'

/**
 * Header cloud icon, always shown. Signed out it starts sign-in; otherwise it opens
 * the account sheet (which explains the problem when sync is not configured).
 */
export const SyncStatusButton = ({ onOpen }: { onOpen: () => void }) => {
  const { status: personal, prepare, signIn } = useSync()
  const status = combineStatus(personal, useSharedSync().status)
  const { t } = useLanguage()

  const { label, icon } = {
    disabled: { label: t.syncUnavailable, icon: <CloudAlertIcon className="w-6 h-6 text-danger" /> },
    signedOut: { label: t.syncWithGoogle, icon: <CloudIcon className="w-6 h-6" /> },
    idle: { label: t.syncStatusIdle, icon: <CloudCheckIcon className="w-6 h-6" /> },
    syncing: { label: t.syncStatusSyncing, icon: <CloudIcon className="w-6 h-6 animate-pulse" /> },
    offline: { label: t.syncStatusOffline, icon: <CloudOffIcon className="w-6 h-6" /> },
    error: { label: t.syncStatusError, icon: <CloudAlertIcon className="w-6 h-6 text-danger" /> },
  }[status]

  const signedOut = status === 'signedOut'

  return (
    <button
      // Preload the SDK on press so sign-in starts within the tap
      onPointerDown={signedOut ? prepare : undefined}
      onClick={signedOut ? () => { void signIn() } : onOpen}
      className="w-11 h-11 flex items-center justify-center rounded-full bg-fill text-accent"
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  )
}
