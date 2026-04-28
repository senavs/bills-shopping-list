import { useState, useEffect } from 'react'
import type { Item } from '../../types'

interface ItemFormProps {
  item?: Item
  onSubmit: (item: Omit<Item, 'id'>) => void
  onCancel: () => void
}

export const ItemForm = ({ item, onSubmit, onCancel }: ItemFormProps) => {
  const [name, setName] = useState(item?.name || '')
  const [quantity, setQuantity] = useState(item?.quantity.toString() || '1')
  const [unitPrice, setUnitPrice] = useState(item?.unitPrice.toString() || '0')
  const [includeInTax, setIncludeInTax] = useState(item?.includeInTax ?? true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (item) {
      setName(item.name)
      setQuantity(item.quantity.toString())
      setUnitPrice(item.unitPrice.toString())
      setIncludeInTax(item.includeInTax)
    }
  }, [item])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    const qty = parseFloat(quantity)
    const price = parseFloat(unitPrice)

    if (isNaN(qty) || qty < 0) {
      setError('Quantity must be 0 or greater')
      return
    }

    if (isNaN(price) || price < 0) {
      setError('Price must be 0 or greater')
      return
    }

    onSubmit({
      name: name.trim(),
      quantity: qty,
      unitPrice: price,
      selected: item?.selected || false,
      includeInTax: includeInTax,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-t-lg sm:rounded-lg p-6 w-full sm:max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {item ? 'Edit Item' : 'Add Item'}
        </h3>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., Milk"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0"
                step="0.01"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Unit Price
              </label>
              <input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                min="0"
                step="0.01"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="includeInTax"
              checked={includeInTax}
              onChange={(e) => setIncludeInTax(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="includeInTax" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              Include in Tax/Tip 🧾
            </label>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded"
            >
              {item ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
