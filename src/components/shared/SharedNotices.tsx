import { useLanguage } from '../../contexts/LanguageContext'
import { useSharedSync } from '../../contexts/SharedSyncContext'
import { CloseIcon } from './icons'

/** Tells the user when a shared list disappeared (deleted by its owner, or access lost). */
export const SharedNotices = () => {
  const { notices, dismissNotice } = useSharedSync()
  const { t } = useLanguage()
  if (notices.length === 0) return null

  return (
    <div className="fixed inset-x-0 top-0 z-50 pt-safe px-4 pointer-events-none">
      <div className="container mx-auto max-w-2xl mt-2 flex flex-col gap-2">
        {notices.map(n => (
          <div
            key={n.id}
            role="status"
            className="pointer-events-auto flex items-center gap-2 bg-surface text-ink border border-hairline rounded-group shadow-lg pl-4 pr-1 py-1"
          >
            <span className="flex-1 text-callout">
              {(n.kind === 'deleted' ? t.sharedListDeletedNotice : t.sharedListRemovedNotice).replace('{name}', n.listName)}
            </span>
            <button
              onClick={() => dismissNotice(n.id)}
              className="w-11 h-11 flex items-center justify-center rounded-full text-muted hover:bg-fill"
              aria-label={t.close}
            >
              <CloseIcon />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
