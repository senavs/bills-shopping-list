import { useState } from 'react'
import type { Item } from '../../types'

interface SectionItemsModalProps {
  allItems: Item[]
  assignedItemIds: string[]      // items already in this section (pre-checked)
  unavailableItemIds: string[]   // items in other sections (hidden)
  onSave: (selectedIds: string[]) => void
  onCancel: () => void
}

export const SectionItemsModal = ({ allItems, assignedItemIds, unavailableItemIds, onSave, onCancel }: SectionItemsModalProps) => {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-t-lg sm:rounded-lg p-6 w-full sm:max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Assign Items to Section</h3>
        {availableItems.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">No available items.</p>
        ) : (
          <ul className="mb-4 max-h-64 overflow-y-auto space-y-2">
            {availableItems.map(item => (
              <li key={item.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`sec-item-${item.id}`}
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                  className="w-5 h-5 shrink-0"
                />
                <label htmlFor={`sec-item-${item.id}`} className="text-gray-900 dark:text-white cursor-pointer">
                  {item.name}
                </label>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            Cancel
          </button>
          <button onClick={() => onSave([...selected])} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
