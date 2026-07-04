import { useState } from 'react'
import type { Item } from '../../types'
import { useLanguage } from '../../contexts/LanguageContext'
import { useScrollLock } from '../../hooks/useScrollLock'

interface SectionItemsModalProps {
  allItems: Item[]
  assignedItemIds: string[]      // items already in this section (pre-checked)
  unavailableItemIds: string[]   // items in other sections (hidden)
  onSave: (selectedIds: string[]) => void
  onCancel: () => void
}

export const SectionItemsModal = ({ allItems, assignedItemIds, unavailableItemIds, onSave, onCancel }: SectionItemsModalProps) => {
  const { t } = useLanguage()
  useScrollLock(true)
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedItemIds))

  const availableItems = allItems.filter(i => !unavailableItemIds.includes(i.id))

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t.assignItemsToSection}</h3>
        {availableItems.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{t.noAvailableItems}</p>
        ) : (
          <ul className="mb-4 max-h-64 overflow-y-auto space-y-1 -webkit-overflow-scrolling-touch">
            {availableItems.map(item => (
              <li key={item.id} className="flex items-center gap-3">
                <label htmlFor={`sec-item-${item.id}`} className="flex items-center gap-3 w-full py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id={`sec-item-${item.id}`}
                    checked={selected.has(item.id)}
                    onChange={() => toggle(item.id)}
                    className="w-5 h-5 shrink-0"
                  />
                  <span className="text-gray-900 dark:text-white">
                    {item.name}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onCancel} className="px-5 py-3 min-h-[44px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            {t.cancel}
          </button>
          <button onClick={() => onSave([...selected])} className="px-5 py-3 min-h-[44px] bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-colors">
            {t.save}
          </button>
        </div>
      </div>
    </div>
  )
}
