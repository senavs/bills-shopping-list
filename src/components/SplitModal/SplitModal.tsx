import { useRef, useState } from 'react'
import type { List } from '../../types'
import { calcSplit } from '../../lib/calculations'
import { formatCurrency } from '../../lib/format'
import { useLanguage } from '../../contexts/LanguageContext'
import { useScrollLock } from '../../hooks/useScrollLock'

interface SplitModalProps {
  list: List
  onClose: () => void
}

export const SplitModal = ({ list, onClose }: SplitModalProps) => {
  const { t, locale } = useLanguage()
  useScrollLock(true)
  const splits = calcSplit(list)

  const formatAmount = (amount: number) => formatCurrency(amount, list.currency, locale)

  // Drag the header down to dismiss, like a native sheet
  const [dragY, setDragY] = useState(0)
  const dragStartRef = useRef<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => { dragStartRef.current = e.touches[0].clientY }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartRef.current === null) return
    setDragY(Math.max(0, e.touches[0].clientY - dragStartRef.current))
  }
  const handleTouchEnd = () => {
    dragStartRef.current = null
    if (dragY > 100) onClose()
    setDragY(0)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.billSplit}
        onClick={(e) => e.stopPropagation()}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
        className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90dvh] pb-safe overflow-y-auto scroll-touch shadow-xl">
        <div
          className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 pl-4 pr-2 py-2 flex items-center justify-between"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t.billSplit}
          </h3>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-2xl leading-none"
            aria-label={t.close}
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {splits.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              {t.addPeopleToSplit}
            </p>
          ) : (
            splits.map(split => (
              <div
                key={split.personId}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                    {split.personName}
                  </h4>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatAmount(split.total)}
                  </span>
                </div>

                {/* Items breakdown */}
                <div className="space-y-1 mb-3">
                  {split.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300 truncate mr-2">
                        {item.name}
                        {item.shared && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">({t.split})</span>
                        )}
                      </span>
                      <span className="text-gray-700 dark:text-gray-200 shrink-0">
                        {formatAmount(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subtotal and tax */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{t.subtotal}</span>
                    <span className="text-gray-700 dark:text-gray-200">{formatAmount(split.subtotal)}</span>
                  </div>
                  {split.taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">{t.tax} ({list.taxPercentage}%)</span>
                      <span className="text-gray-700 dark:text-gray-200">{formatAmount(split.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-1">
                    <span className="text-gray-900 dark:text-white">{t.total}</span>
                    <span className="text-gray-900 dark:text-white">{formatAmount(split.total)}</span>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Grand total verification */}
          {splits.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex justify-between font-semibold text-gray-900 dark:text-white">
                <span>{t.grandTotal}</span>
                <span>{formatAmount(splits.reduce((sum, s) => sum + s.total, 0))}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
