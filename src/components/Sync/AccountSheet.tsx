import { useSync } from '../../contexts/SyncContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { BottomSheet, type BottomSheetAction } from '../shared/BottomSheet'
import { CloudAlertIcon, CloudIcon, CloseIcon } from '../shared/icons'
import { formatSyncedAgo } from '../../lib/sync/formatSyncedAgo'

/** Signed-in account actions. Shows no personal data (no name, photo or e-mail). */
export const AccountSheet = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { status, errorKind, lastSyncedAt, signIn, signOut, syncNow } = useSync()
  const { t, locale } = useLanguage()

  // Build shipped without the Firebase config: nothing to act on, just explain
  if (status === 'disabled') {
    return (
      <BottomSheet isOpen={isOpen} title={t.syncAccount} onClose={onClose}>
        <div className="text-center">
          <p className="flex items-center justify-center gap-1.5 text-body font-semibold text-danger">
            <CloudAlertIcon className="w-5 h-5" />
            {t.syncUnavailable}
          </p>
          <p className="text-footnote text-muted mt-1">{t.syncUnavailableHint}</p>
        </div>
      </BottomSheet>
    )
  }

  const statusText = {
    disabled: '', signedOut: '',
    idle: t.syncStatusIdle, syncing: t.syncStatusSyncing, offline: t.syncStatusOffline, error: t.syncStatusError,
  }[status]

  const actions: BottomSheetAction[] = [
    status === 'error' && errorKind === 'auth'
      ? { id: 'signin', label: t.signInAgain, icon: <CloudIcon />, onAction: () => { void signIn() } }
      : { id: 'sync', label: t.syncNow, icon: <CloudIcon />, onAction: syncNow },
    { id: 'signout', label: t.signOut, icon: <CloseIcon />, variant: 'destructive', onAction: () => { void signOut() } },
  ]

  return (
    <BottomSheet isOpen={isOpen} title={t.syncAccount} actions={actions} onClose={onClose}>
      <div className="text-center">
        <p className="text-body text-ink">{t.connectedWithGoogle} · {statusText}</p>
        {lastSyncedAt !== null && (
          <p className="text-footnote text-muted">{t.lastSynced}: {formatSyncedAgo(lastSyncedAt, Date.now(), locale)}</p>
        )}
        <p className="text-footnote text-muted mt-1">{t.signOutHint}</p>
      </div>
    </BottomSheet>
  )
}
