import { useState, useEffect } from 'react'
import type { Item, Section, Person } from '../../types'
import { useLanguage } from '../../contexts/LanguageContext'
import { parseLocaleNumber } from '../../lib/format'

interface ItemFormProps {
  item?: Item
  sections?: Pick<Section, 'id' | 'name'>[]
  people?: Person[]
  initialSectionId?: string
  onSubmit: (item: Omit<Item, 'id'>, sectionId: string) => void
  onCancel: () => void
}

export const ItemForm = ({ item, sections = [], people = [], initialSectionId = '', onSubmit, onCancel }: ItemFormProps) => {
  const { t } = useLanguage()
  const [name, setName] = useState(item?.name || '')
  const [quantity, setQuantity] = useState(item?.quantity.toString() || '1')
  const [unitPrice, setUnitPrice] = useState(item?.unitPrice.toString() || '0')
  const [includeInTax, setIncludeInTax] = useState(item?.includeInTax ?? true)
  const [selected, setSelected] = useState(item?.selected ?? false)
  const [sectionId, setSectionId] = useState(initialSectionId)
  const [assignedTo, setAssignedTo] = useState<string[]>(item?.assignedTo || [])
  const [error, setError] = useState('')

  useEffect(() => {
    if (item) {
      setName(item.name)
      setQuantity(item.quantity.toString())
      setUnitPrice(item.unitPrice.toString())
      setIncludeInTax(item.includeInTax)
      setSelected(item.selected)
      setAssignedTo(item.assignedTo || [])
    }
  }, [item])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError(t.nameRequired)
      return
    }

    const qty = parseLocaleNumber(quantity)
    const price = parseLocaleNumber(unitPrice)

    if (isNaN(qty) || qty < 0) {
      setError(t.quantityError)
      return
    }

    if (isNaN(price) || price < 0) {
      setError(t.priceError)
      return
    }

    onSubmit({ name: name.trim(), quantity: qty, unitPrice: price, selected, includeInTax, assignedTo }, sectionId)
  }

  const togglePerson = (personId: string) => {
    setAssignedTo(prev =>
      prev.includes(personId)
        ? prev.filter(id => id !== personId)
        : [...prev, personId]
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-t-lg sm:rounded-lg p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {item ? t.editItem : t.addItemTitle}
        </h3>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded text-sm">
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
              placeholder={t.itemNamePlaceholder}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.quantity}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.unitPrice}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
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
              {t.includeInTax} 🧾
            </label>
          </div>

          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="selected"
              checked={selected}
              onChange={(e) => setSelected(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="selected" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              {t.selected} 🛒
            </label>
          </div>

          {people.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.assignToPeople}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {t.leaveEmptyToShare}
              </p>
              <div className="flex flex-wrap gap-2">
                {people.map(person => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => togglePerson(person.id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      assignedTo.includes(person.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {person.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sections.length > 0 && (
            <div className="mb-4">
              <label htmlFor="sectionId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.section}
              </label>
              <select
                id="sectionId"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">{t.noSection}</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded"
            >
              {item ? t.save : t.add}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
