import { useState, useEffect } from 'react'
import type { Item, Section, Person, UnitType } from '../../types'
import { useLanguage } from '../../contexts/LanguageContext'
import { parseLocaleNumber } from '../../lib/format'
import { getUnitTypeOptions } from '../../lib/unitTypes'
import { useScrollLock } from '../../hooks/useScrollLock'

interface ItemFormProps {
  item?: Item
  sections?: Pick<Section, 'id' | 'name'>[]
  people?: Person[]
  initialSectionId?: string
  onSubmit: (item: Omit<Item, 'id'>, sectionId: string) => void
  onCancel: () => void
}

export const ItemForm = ({ item, sections = [], people = [], initialSectionId = '', onSubmit, onCancel }: ItemFormProps) => {
  const { locale, t } = useLanguage()
  useScrollLock(true)
  const [name, setName] = useState(item?.name || '')
  const [quantity, setQuantity] = useState(item?.quantity.toString() || '1')
  const [unitType, setUnitType] = useState<UnitType>(item?.unitType ?? 'unit')
  // New items start with an empty price so the user doesn't have to delete a 0 first
  const [unitPrice, setUnitPrice] = useState(item ? item.unitPrice.toString() : '')
  const [includeInTax, setIncludeInTax] = useState(item?.includeInTax ?? true)
  const [selected, setSelected] = useState(item?.selected ?? false)
  const [sectionId, setSectionId] = useState(initialSectionId)
  const [assignedTo, setAssignedTo] = useState<string[]>(item?.assignedTo || [])
  const [error, setError] = useState('')

  useEffect(() => {
    if (item) {
      setName(item.name)
      setQuantity(item.quantity.toString())
      setUnitType(item.unitType ?? 'unit')
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
    // An empty price means the user hasn't priced the item yet
    const price = unitPrice.trim() === '' ? 0 : parseLocaleNumber(unitPrice)

    if (isNaN(qty) || qty < 0) {
      setError(t.quantityError)
      return
    }

    if (isNaN(price) || price < 0) {
      setError(t.priceError)
      return
    }

    onSubmit({ name: name.trim(), quantity: qty, unitPrice: price, unitType, selected, includeInTax, assignedTo }, sectionId)
  }

  const togglePerson = (personId: string) => {
    setAssignedTo(prev =>
      prev.includes(personId)
        ? prev.filter(id => id !== personId)
        : [...prev, personId]
    )
  }

  const inputClass = 'w-full px-4 py-3 border border-hairline rounded-xl bg-surface text-ink'
  const labelClass = 'block text-sm font-medium text-ink mb-2'

  const renderSwitchRow = (id: string, label: string, checked: boolean, onChange: (checked: boolean) => void) => (
    <label htmlFor={id} className="flex items-center justify-between gap-3 min-h-[44px] py-2 cursor-pointer select-none">
      <span className="text-base text-ink">{label}</span>
      <input
        type="checkbox"
        id={id}
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative inline-flex shrink-0 w-[51px] h-[31px] rounded-full bg-fill peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2  after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-[27px] after:h-[27px] after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  )

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div role="dialog" aria-modal="true" aria-label={item ? t.editItem : t.addItemTitle} className="bg-surface rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90dvh] flex flex-col overflow-hidden shadow-xl">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          {/* iOS-style sheet header: stays visible above the keyboard while the body scrolls */}
          <div className="flex items-center justify-between gap-2 px-2 py-2 border-b border-hairline shrink-0">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 min-h-[44px] text-accent rounded-xl hover:bg-fill"
            >
              {t.cancel}
            </button>
            <h3 className="text-base font-semibold text-ink truncate">
              {item ? t.editItem : t.addItemTitle}
            </h3>
            <button
              type="submit"
              className="px-3 min-h-[44px] font-semibold text-accent rounded-xl hover:bg-fill"
            >
              {item ? t.save : t.add}
            </button>
          </div>

          <div className="overflow-y-auto overscroll-contain scroll-touch px-6 pt-4 pb-safe">
            {error && (
              <div className="mb-4 p-3 bg-danger/10 text-danger rounded text-sm">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="itemName" className={labelClass}>
                {t.name} *
              </label>
              <input
                type="text"
                id="itemName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder={t.itemNamePlaceholder}
                autoFocus={!item}
                autoCapitalize="sentences"
                autoComplete="off"
                enterKeyHint="next"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="itemQuantity" className={labelClass}>
                  {t.quantity}
                </label>
                <input
                  type="text"
                  id="itemQuantity"
                  inputMode="decimal"
                  enterKeyHint="next"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="itemUnitType" className={labelClass}>
                  {t.unitType}
                </label>
                <select
                  id="itemUnitType"
                  value={unitType}
                  onChange={(e) => setUnitType(e.target.value as UnitType)}
                  className={inputClass}
                >
                  {getUnitTypeOptions(locale).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="itemUnitPrice" className={labelClass}>
                {t.unitPrice}
              </label>
              <input
                type="text"
                id="itemUnitPrice"
                inputMode="decimal"
                enterKeyHint="done"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder={t.pricePlaceholder}
                className={`${inputClass} text-lg`}
              />
            </div>

            <div className="mb-4 divide-y divide-hairline">
              {renderSwitchRow('includeInTax', t.includeInTax, includeInTax, setIncludeInTax)}
              {renderSwitchRow('selected', t.selected, selected, setSelected)}
            </div>

            {people.length > 0 && (
              <div className="mb-4">
                <span className={labelClass}>
                  {t.assignToPeople}
                </span>
                <p className="text-xs text-muted mb-2">
                  {t.leaveEmptyToShare}
                </p>
                <div className="flex flex-wrap gap-2">
                  {people.map(person => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => togglePerson(person.id)}
                      className={`px-3 py-1.5 rounded-full text-sm ${
                        assignedTo.includes(person.id)
                          ? 'bg-accent text-on-accent'
                          : 'bg-fill text-ink border border-hairline'
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
                <label htmlFor="sectionId" className={labelClass}>
                  {t.section}
                </label>
                <select
                  id="sectionId"
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">{t.noSection}</option>
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
