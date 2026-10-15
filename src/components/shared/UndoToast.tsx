import { useEffect } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'

interface UndoToastProps {
  message: string
  duration?: number
  onUndo: () => void
  onDismiss: () => void
}

export const UndoToast = ({ message, duration = 5000, onUndo, onDismiss }: UndoToastProps) => {
  const { t } = useLanguage()

  // One timer for the dismissal; the progress bar is a pure CSS animation
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [duration, onDismiss])

  // Sit above the TotalsBar when present, otherwise above the home indicator
  return (
    <div
      role="status"
      className="fixed left-safe right-safe sm:left-auto sm:w-80 z-50 animate-slide-up"
      style={{ bottom: 'calc(max(var(--totals-bar-h, 0px), env(safe-area-inset-bottom)) + 0.75rem)' }}
    >
      <div className="bg-gray-800 dark:bg-gray-700 text-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between pl-4 pr-1">
          <span className="text-sm truncate mr-3">{message}</span>
          <button
            onClick={onUndo}
            className="px-3 min-h-[44px] text-blue-400 hover:text-blue-300 font-semibold text-sm shrink-0"
          >
            {t.undo}
          </button>
        </div>
        <div className="h-1 bg-gray-600">
          <div
            className="h-full bg-blue-500 animate-toast-progress"
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      </div>
    </div>
  )
}
