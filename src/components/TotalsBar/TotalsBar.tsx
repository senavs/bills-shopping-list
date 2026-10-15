import { useEffect, useRef, useState } from 'react'
import type { List } from '../../types'
import { calcTotals } from '../../lib/calculations'
import { formatCurrency } from '../../lib/format'
import { useLanguage } from '../../contexts/LanguageContext'
import { BottomSheet } from '../shared/BottomSheet'

interface TotalsBarProps {
  list: List
  onAddItem?: () => void
}

export const TotalsBar = ({ list, onAddItem }: TotalsBarProps) => {
  const { t, locale } = useLanguage()
  const totals = calcTotals(list)
  const [showDetails, setShowDetails] = useState(false)

  const fmt = (amount: number) => formatCurrency(amount, list.currency, locale)

  const taxAmount = totals.totalAllWithTax - totals.totalAll
  const barRef = useRef<HTMLDivElement>(null)

  // While shopping, what matters is what's already in the cart; at a restaurant or bar
  // it's the bill with tax/tip. Templates have no selection, so they show the total.
  const cartFirst = list.type === 'shopping' && !list.isTemplate
  const primary = cartFirst
    ? { label: t.inCart, value: totals.totalSelected }
    : { label: t.total, value: totals.totalAllWithTax }
  const secondary = cartFirst
    ? { label: t.totalWithTax, value: totals.totalAllWithTax }
    : { label: t.subtotal, value: totals.totalAll }

  // Publish the bar height (safe area included) so other fixed elements, like
  // the undo toast, can sit above it instead of overlapping it
  useEffect(() => {
    const el = barRef.current
    if (!el) return
    const root = document.documentElement
    const update = () => root.style.setProperty('--totals-bar-h', `${el.offsetHeight}px`)
    update()

    if (typeof ResizeObserver === 'undefined') {
      return () => root.style.removeProperty('--totals-bar-h')
    }
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--totals-bar-h')
    }
  }, [])

  const detailRows = [
    { label: t.subtotal, value: totals.totalAll },
    { label: `${t.tax} (${list.taxPercentage}%)`, value: taxAmount },
    { label: t.selectedTotal, value: totals.totalSelected },
    { label: t.total, value: totals.totalAllWithTax },
  ]

  return (
    <>
      <div
        ref={barRef}
        data-testid="totals-bar"
        className="fixed bottom-0 left-0 right-0 z-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div
          className="container mx-auto max-w-4xl flex items-center gap-3 py-2"
          style={{
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
        >
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="flex-1 min-w-0 text-left py-1 rounded-lg"
            aria-label={t.showTotals}
          >
            <span className="flex items-baseline gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{primary.label}</span>
              <span className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white truncate" data-testid="totals-primary">
                {fmt(primary.value)}
              </span>
            </span>
            <span className="block text-sm tabular-nums text-gray-500 dark:text-gray-400 truncate">
              {secondary.label} {fmt(secondary.value)}
            </span>
          </button>

          {onAddItem && (
            <button
              type="button"
              onClick={onAddItem}
              className="shrink-0 w-[52px] h-[52px] bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 flex items-center justify-center"
              aria-label={t.addItem}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6" aria-hidden="true">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <BottomSheet isOpen={showDetails} title={list.name} onClose={() => setShowDetails(false)}>
        <dl className="divide-y divide-gray-200 dark:divide-gray-700 pb-4">
          {detailRows.map(row => (
            <div key={row.label} className="flex items-center justify-between py-3">
              <dt className="text-gray-600 dark:text-gray-300">{row.label}</dt>
              <dd className="font-semibold tabular-nums text-gray-900 dark:text-white">{fmt(row.value)}</dd>
            </div>
          ))}
        </dl>
      </BottomSheet>
    </>
  )
}
