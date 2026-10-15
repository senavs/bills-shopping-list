import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useLists } from '../../hooks/useLists'
import { useLanguage } from '../../contexts/LanguageContext'
import { parseLocaleNumber } from '../../lib/format'

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
    
    const tax = parseLocaleNumber(taxPercentage)
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
    <div className="min-h-dvh bg-bg pt-safe">
      <div className="container mx-auto p-4 max-w-2xl">
        <h1 className="text-large-title font-bold text-ink mb-6">
          {id ? (existingList?.isTemplate ? t.editTemplate : t.editList) : t.createList}
        </h1>

        <form onSubmit={handleSubmit} className="bg-surface rounded-group p-4">
          {error && (
            <div className="mb-4 p-3 bg-danger/10 text-danger rounded">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-ink mb-2">
              {t.name} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-hairline rounded bg-surface text-ink"
              placeholder={t.namePlaceholder}
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="list-type" className="block text-sm font-medium text-ink mb-2">
              {t.type} *
            </label>
            <select
              id="list-type"
              value={type}
              onChange={(e) => setType(e.target.value as 'shopping' | 'restaurant' | 'bar')}
              className="w-full px-3 py-2 border border-hairline rounded bg-surface text-ink"
            >
              <option value="shopping">🛒 {t.shopping}</option>
              <option value="restaurant">🍽️ {t.restaurant}</option>
              <option value="bar">🍻 {t.bar}</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-ink mb-2">
              {t.currency} *
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'BRL' | 'USD')}
              className="w-full px-3 py-2 border border-hairline rounded bg-surface text-ink"
            >
              <option value="BRL">BRL (R$)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-ink mb-2">
              {t.taxTipPercentage}
            </label>
            <input
              type="text"
              inputMode="decimal"
              enterKeyHint="done"
              value={taxPercentage}
              onChange={(e) => setTaxPercentage(e.target.value)}
              required
              className="w-full px-3 py-2 border border-hairline rounded bg-surface text-ink"
              placeholder="0"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigateBack()}
              className="px-4 min-h-[44px] text-accent rounded-xl hover:bg-fill"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-5 min-h-[44px] bg-accent text-on-accent font-semibold active:opacity-80 rounded-xl"
            >
              {id ? t.saveChanges : t.createList}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
