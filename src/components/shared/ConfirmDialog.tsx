import { useLanguage } from '../../contexts/LanguageContext'
import { useScrollLock } from '../../hooks/useScrollLock'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  variant?: 'destructive' | 'info'
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDialog = ({ isOpen, title, message, variant = 'destructive', confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) => {
  const { t } = useLanguage()
  useScrollLock(isOpen)

  if (!isOpen) return null

  const confirmButtonClass = variant === 'destructive'
    ? 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
    : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={onCancel}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 min-h-[44px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 min-h-[44px] rounded-xl transition-colors ${confirmButtonClass}`}
          >
            {confirmLabel || t.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}
