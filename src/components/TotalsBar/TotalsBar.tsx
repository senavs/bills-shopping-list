import type { List } from '../../types'
import { calcTotals } from '../../lib/calculations'

interface TotalsBarProps {
  list: List
}

export const TotalsBar = ({ list }: TotalsBarProps) => {
  const totals = calcTotals(list)
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: list.currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const taxAmount = totals.totalAllWithTax - totals.totalAll

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Subtotal</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatCurrency(totals.totalAll)}
            </div>
          </div>
          
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Tax ({list.taxPercentage}%)</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatCurrency(taxAmount)}
            </div>
          </div>
          
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Selected</div>
            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {formatCurrency(totals.totalSelected)}
            </div>
          </div>
          
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totals.totalAllWithTax)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
