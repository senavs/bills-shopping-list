import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useLists } from '../../hooks/useLists'
import { useLanguage } from '../../contexts/LanguageContext'
import { parseLocaleNumber } from '../../lib/format'
import { useSync } from '../../contexts/SyncContext'
import { loadSharedName, saveSharedName } from '../../lib/sharedSync/sharedName'

export const ListForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const locationState = location.state as { activeTab?: 'active' | 'archived' | 'templates'; from?: string } | null
  const { lists, createList, createSharedList, updateList } = useLists()
  const { t, isBR } = useLanguage()
  const sync = useSync()
  // Sharing needs Firebase, and only applies when creating
  const canShare = !id && sync.status !== 'disabled'
  
  const existingList = id ? lists.find(l => l.id === id) : null
  
  const [name, setName] = useState(existingList?.name || '')
  const [type, setType] = useState<'shopping' | 'restaurant' | 'bar'>(existingList?.type || 'shopping')
  const [currency, setCurrency] = useState<'BRL' | 'USD'>(existingList?.currency || (isBR ? 'BRL' : 'USD'))
  const [taxPercentage, setTaxPercentage] = useState(existingList?.taxPercentage.toString() || '0')
  const [error, setError] = useState('')
  const [shared, setShared] = useState(false)
  const [myName, setMyName] = useState(loadSharedName)

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
    } else if (shared && canShare && !sync.uid) {
      // Signed out after ticking "shared": never fall back to a private list silently
      setError(t.sharedSignedOut)
      return
    } else if (shared && sync.uid) {
      if (!myName.trim()) {
        setError(t.yourNameRequired)
        return
      }
      saveSharedName(myName.trim())
      const newId = createSharedList({ name: name.trim(), type, currency, taxPercentage: tax }, { uid: sync.uid, name: myName.trim() })
      // Straight to the list, where the invite button is
      navigate(`/lists/${newId}`)
      return
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

          {canShare && (
            <div className="mb-6">
              <label className="flex items-start gap-3 min-h-[44px]">
                <input
                  type="checkbox"
                  checked={shared}
                  // Stays editable while ticked, so losing sign-in never traps the form
                  disabled={!sync.uid && !shared}
                  onChange={(e) => setShared(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-accent"
                  aria-labelledby="shared-list-label"
                  aria-describedby="shared-list-hint"
                />
                <span>
                  <span id="shared-list-label" className="block text-sm font-medium text-ink">{t.sharedList}</span>
                  <span id="shared-list-hint" className="block text-sm text-muted">{t.sharedListHint}</span>
                </span>
              </label>
              {!sync.uid && (
                <button
                  type="button"
                  onPointerDown={sync.prepare}
                  onClick={() => { void sync.signIn() }}
                  className="mt-2 px-4 min-h-[44px] text-accent rounded-xl hover:bg-fill text-sm font-semibold"
                >
                  {t.signInToShare}
                </button>
              )}
              {shared && sync.uid && (
                <div className="mt-3">
                  <label htmlFor="shared-my-name" className="block text-sm font-medium text-ink mb-2">
                    {t.yourNameInList} *
                  </label>
                  <input
                    id="shared-my-name"
                    type="text"
                    value={myName}
                    onChange={(e) => setMyName(e.target.value)}
                    autoCapitalize="words"
                    autoComplete="off"
                    className="w-full px-3 py-2 border border-hairline rounded bg-surface text-ink"
                  />
                </div>
              )}
            </div>
          )}

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
