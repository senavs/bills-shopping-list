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
    ? 'bg-danger text-white active:opacity-80'
    : 'bg-accent text-on-accent active:opacity-80'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-ink mb-2">{title}</h3>
        <p className="text-muted mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 min-h-[44px] text-ink hover:bg-fill rounded-xl"
          >
            {t.cancel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 min-h-[44px] rounded-xl ${confirmButtonClass}`}
          >
            {confirmLabel || t.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}
