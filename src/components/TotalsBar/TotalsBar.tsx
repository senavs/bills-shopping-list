import { useEffect, useRef, useState } from 'react'
import type { List } from '../../types'
import { calcTotals } from '../../lib/calculations'
import { formatCurrency } from '../../lib/format'
import { useLanguage } from '../../contexts/LanguageContext'
import { BottomSheet } from '../shared/BottomSheet'
import { PlusIcon } from '../shared/icons'

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
        className="fixed bottom-0 left-0 right-0 z-20 bg-surface/85 backdrop-blur-md border-t border-hairline"
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
            className="flex-1 min-w-0 text-left py-1"
            aria-label={t.showTotals}
          >
            <span className="flex items-center gap-2">
              <span className="text-footnote text-muted">{primary.label}</span>
              {/* The price tag: the only yellow in the app */}
              <span
                className="num text-title font-bold bg-tag text-on-tag rounded-md px-2 py-0.5 truncate"
                data-testid="totals-primary"
              >
                {fmt(primary.value)}
              </span>
            </span>
            <span className="block mt-0.5 text-footnote num text-muted truncate">
              {secondary.label} {fmt(secondary.value)}
            </span>
          </button>

          {onAddItem && (
            <button
              type="button"
              onClick={onAddItem}
              className="shrink-0 w-[52px] h-[52px] bg-accent text-on-accent rounded-full shadow-md active:opacity-80 flex items-center justify-center"
              aria-label={t.addItem}
            >
              <PlusIcon className="w-7 h-7" />
            </button>
          )}
        </div>
      </div>

      <BottomSheet isOpen={showDetails} title={list.name} onClose={() => setShowDetails(false)}>
        <dl className="bg-bg rounded-group divide-y divide-hairline mb-4">
          {detailRows.map(row => (
            <div key={row.label} className="flex items-center justify-between px-4 min-h-[44px]">
              <dt className="text-body text-ink">{row.label}</dt>
              <dd className="text-body num font-semibold text-ink">{fmt(row.value)}</dd>
            </div>
          ))}
        </dl>
      </BottomSheet>
    </>
  )
}
