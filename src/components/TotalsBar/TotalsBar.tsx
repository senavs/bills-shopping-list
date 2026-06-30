import type { List } from '../../types'
import { calcTotals } from '../../lib/calculations'
import { formatCurrency } from '../../lib/format'
import { useLanguage } from '../../contexts/LanguageContext'

interface TotalsBarProps {
  list: List
}

export const TotalsBar = ({ list }: TotalsBarProps) => {
  const { t, locale } = useLanguage()
  const totals = calcTotals(list)

  const fmt = (amount: number) => formatCurrency(amount, list.currency, locale)

  const taxAmount = totals.totalAllWithTax - totals.totalAll

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t.subtotal}</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {fmt(totals.totalAll)}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t.tax} ({list.taxPercentage}%)</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {fmt(taxAmount)}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t.selectedTotal}</div>
            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {fmt(totals.totalSelected)}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t.total}</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {fmt(totals.totalAllWithTax)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
