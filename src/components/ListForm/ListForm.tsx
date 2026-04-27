import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLists } from '../../hooks/useLists'

export const ListForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { lists, createList, updateList } = useLists()
  
  const existingList = id ? lists.find(l => l.id === id) : null
  
  const [name, setName] = useState(existingList?.name || '')
  const [type, setType] = useState<'shopping' | 'restaurant'>(existingList?.type || 'shopping')
  const [currency, setCurrency] = useState<'BRL' | 'USD'>(existingList?.currency || 'USD')
  const [taxPercentage, setTaxPercentage] = useState(existingList?.taxPercentage.toString() || '0')
  const [error, setError] = useState('')

  useEffect(() => {
    if (existingList) {
      setName(existingList.name)
      setType(existingList.type)
      setCurrency(existingList.currency)
      setTaxPercentage(existingList.taxPercentage.toString())
    }
  }, [existingList])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    
    const tax = parseFloat(taxPercentage)
    if (isNaN(tax) || tax < 0) {
      setError('Tax percentage must be 0 or greater')
      return
    }

    if (id && existingList) {
      updateList(id, { name: name.trim(), type, currency, taxPercentage: tax })
    } else {
      createList({ name: name.trim(), type, currency, taxPercentage: tax })
    }
    
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-4 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {id ? 'Edit List' : 'Create List'}
        </h1>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">
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
              placeholder="e.g., Weekly Groceries"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="shopping"
                  checked={type === 'shopping'}
                  onChange={(e) => setType(e.target.value as 'shopping')}
                  className="mr-2"
                />
                <span className="text-gray-900 dark:text-white">🛒 Shopping</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="restaurant"
                  checked={type === 'restaurant'}
                  onChange={(e) => setType(e.target.value as 'restaurant')}
                  className="mr-2"
                />
                <span className="text-gray-900 dark:text-white">🍽️ Restaurant</span>
              </label>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Currency *
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'BRL' | 'USD')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="USD">USD ($)</option>
              <option value="BRL">BRL (R$)</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tax/Tip Percentage
            </label>
            <input
              type="number"
              value={taxPercentage}
              onChange={(e) => setTaxPercentage(e.target.value)}
              min="0"
              step="0.1"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="0"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded"
            >
              {id ? 'Save Changes' : 'Create List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
