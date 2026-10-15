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
        className="bg-surface rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90dvh] pb-safe overflow-y-auto scroll-touch shadow-xl">
        <div
          className="sticky top-0 bg-surface border-b border-hairline pl-4 pr-2 py-2 flex items-center justify-between"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <h3 className="text-lg font-semibold text-ink">
            {t.billSplit}
          </h3>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-full text-muted hover:bg-fill text-2xl leading-none"
            aria-label={t.close}
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {splits.length === 0 ? (
            <p className="text-center text-muted py-8">
              {t.addPeopleToSplit}
            </p>
          ) : (
            splits.map(split => (
              <div
                key={split.personId}
                className="bg-bg rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-ink text-lg">
                    {split.personName}
                  </h4>
                  <span className="text-lg font-bold text-accent">
                    {formatAmount(split.total)}
                  </span>
                </div>

                {/* Items breakdown */}
                <div className="space-y-1 mb-3">
                  {split.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-muted truncate mr-2">
                        {item.name}
                        {item.shared && (
                          <span className="text-xs text-muted ml-1">({t.split})</span>
                        )}
                      </span>
                      <span className="text-ink shrink-0">
                        {formatAmount(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subtotal and tax */}
                <div className="border-t border-hairline pt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">{t.subtotal}</span>
                    <span className="text-ink">{formatAmount(split.subtotal)}</span>
                  </div>
                  {split.taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">{t.tax} ({list.taxPercentage}%)</span>
                      <span className="text-ink">{formatAmount(split.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-1">
                    <span className="text-ink">{t.total}</span>
                    <span className="text-ink">{formatAmount(split.total)}</span>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Grand total verification */}
          {splits.length > 0 && (
            <div className="border-t border-hairline pt-4">
              <div className="flex justify-between font-semibold text-ink">
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
