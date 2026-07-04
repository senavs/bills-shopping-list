import { useEffect, useRef, useState } from 'react'
import { useScrollLock } from '../../hooks/useScrollLock'

export interface BottomSheetAction {
  id: string
  label: string
  icon: string
  variant?: 'default' | 'destructive'
  onAction: () => void
}

interface BottomSheetProps {
  isOpen: boolean
  title?: string
  actions: BottomSheetAction[]
  onClose: () => void
}

export const BottomSheet = ({ isOpen, title, actions, onClose }: BottomSheetProps) => {
  useScrollLock(isOpen)
  const [isVisible, setIsVisible] = useState(false)
  const [translateY, setTranslateY] = useState(0)
  const touchStartRef = useRef<number>(0)
  const isDraggingRef = useRef(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      // Delay to allow CSS transition
      requestAnimationFrame(() => setIsVisible(true))
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientY
    isDraggingRef.current = true
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return
    const deltaY = e.touches[0].clientY - touchStartRef.current
    if (deltaY > 0) {
      setTranslateY(deltaY)
    }
  }

  const handleTouchEnd = () => {
    isDraggingRef.current = false
    if (translateY > 100) {
      onClose()
    }
    setTranslateY(0)
  }

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 z-[55] transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl transition-transform duration-200 ease-out ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ transform: translateY > 0 ? `translateY(${translateY}px)` : undefined }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Title */}
        {title && (
          <div className="px-5 pb-2">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {title}
            </h3>
          </div>
        )}

        {/* Actions */}
        <div className="px-2 pb-safe">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => {
                action.onAction()
                onClose()
              }}
              className={`w-full flex items-center gap-4 px-4 py-3.5 min-h-[52px] rounded-xl transition-colors ${
                action.variant === 'destructive'
                  ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/30'
                  : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600'
              }`}
            >
              <span className="text-xl w-8 text-center">{action.icon}</span>
              <span className="text-base font-medium">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Bottom safe area padding for iOS */}
        <div className="h-6" />
      </div>
    </div>
  )
}
