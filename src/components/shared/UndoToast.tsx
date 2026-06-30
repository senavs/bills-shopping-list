import { useEffect, useState } from 'react'

interface UndoToastProps {
  message: string
  duration?: number
  onUndo: () => void
  onDismiss: () => void
}

export const UndoToast = ({ message, duration = 5000, onUndo, onDismiss }: UndoToastProps) => {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const interval = 50
    const step = (interval / duration) * 100
    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev - step
        if (next <= 0) {
          clearInterval(timer)
          onDismiss()
          return 0
        }
        return next
      })
    }, interval)

    return () => clearInterval(timer)
  }, [duration, onDismiss])

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-slide-up">
      <div className="bg-gray-800 dark:bg-gray-700 text-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm truncate mr-3">{message}</span>
          <button
            onClick={onUndo}
            className="text-blue-400 hover:text-blue-300 font-semibold text-sm shrink-0"
          >
            Undo
          </button>
        </div>
        <div className="h-1 bg-gray-600">
          <div
            className="h-full bg-blue-500 transition-all duration-50 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
