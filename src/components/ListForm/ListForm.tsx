import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useLists } from '../../hooks/useLists'
import { useLanguage } from '../../contexts/LanguageContext'

export const ListForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const locationState = location.state as { activeTab?: 'active' | 'archived' | 'templates'; from?: string } | null
  const { lists, createList, updateList } = useLists()
  const { t, isBR } = useLanguage()
  
  const existingList = id ? lists.find(l => l.id === id) : null
  
  const [name, setName] = useState(existingList?.name || '')
  const [type, setType] = useState<'shopping' | 'restaurant' | 'bar'>(existingList?.type || 'shopping')
  const [currency, setCurrency] = useState<'BRL' | 'USD'>(existingList?.currency || (isBR ? 'BRL' : 'USD'))
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

  const navigateBack = () => {
    // If we came from a list detail page, go back there with state preserved
    if (locationState?.from && locationState.from.startsWith('/lists/')) {
      navigate(locationState.from, { state: { activeTab: locationState?.activeTab, from: '/app' } })
    } else {
      // Otherwise go back to dashboard with the correct tab
      navigate('/app', { state: { activeTab: locationState?.activeTab } })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError(t.nameRequired)
      return
    }
    
    const tax = parseFloat(taxPercentage)
    if (isNaN(tax) || tax < 0) {
      setError(t.taxMustBePositive)
      return
    }

    if (id && existingList) {
      updateList(id, { name: name.trim(), type, currency, taxPercentage: tax })
    } else {
      createList({ name: name.trim(), type, currency, taxPercentage: tax })
    }
    
    navigateBack()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-safe">
      <div className="container mx-auto p-4 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {id ? (existingList?.isTemplate ? t.editTemplate : t.editList) : t.createList}
        </h1>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.name} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder={t.namePlaceholder}
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="list-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.type} *
            </label>
            <select
              id="list-type"
              value={type}
              onChange={(e) => setType(e.target.value as 'shopping' | 'restaurant' | 'bar')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="shopping">🛒 {t.shopping}</option>
              <option value="restaurant">🍽️ {t.restaurant}</option>
              <option value="bar">🍻 {t.bar}</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.currency} *
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'BRL' | 'USD')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="BRL">BRL (R$)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.taxTipPercentage}
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
              onClick={() => navigateBack()}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded"
            >
              {id ? t.saveChanges : t.createList}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
