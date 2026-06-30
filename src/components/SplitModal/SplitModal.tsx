import type { List } from '../../types'
import { calcSplit } from '../../lib/calculations'
import { useLanguage } from '../../contexts/LanguageContext'

interface SplitModalProps {
  list: List
  onClose: () => void
}

export const SplitModal = ({ list, onClose }: SplitModalProps) => {
  const { t } = useLanguage()
  const splits = calcSplit(list)
  const currency = list.currency === 'BRL' ? 'R$' : '$'

  const formatAmount = (amount: number) => `${currency} ${amount.toFixed(2)}`

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-t-lg sm:rounded-lg w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Bill Split
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {splits.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              Add people to this list to see the split
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
