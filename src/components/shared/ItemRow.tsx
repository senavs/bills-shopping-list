import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Item, Person } from '../../types'
import { formatCurrency } from '../../lib/format'
import { useLanguage } from '../../contexts/LanguageContext'
import { DragHandle } from './DragHandle'

interface ItemRowProps {
  item: Item
  currency: string
  hideCheckbox?: boolean
  people?: Person[]
  onToggleSelected: (selected: boolean) => void
  onEdit: () => void
  onDelete: () => void
}

export const ItemRow = ({
  item, currency, hideCheckbox, people = [],
  onToggleSelected, onEdit, onDelete,
}: ItemRowProps) => {
  const { locale, t } = useLanguage()
  const fmt = (amount: number) => formatCurrency(amount, currency, locale)
  const assignedPeople = (item.assignedTo || [])
    .map(id => people.find(p => p.id === id))
    .filter((p): p is Person => !!p)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-1.5 transition-shadow ${
        isDragging ? 'shadow-lg ring-2 ring-blue-400/50 opacity-90 z-50' : ''
      }`}
    >
      <DragHandle listeners={listeners} attributes={attributes} />

      {!hideCheckbox && (
        <label className="flex items-center justify-center w-9 h-9 shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={item.selected}
            onChange={(e) => onToggleSelected(e.target.checked)}
            className="w-5 h-5"
          />
        </label>
      )}

      <div className="flex-1 min-w-0 ml-1">
        <h3 className={`font-medium truncate ${!hideCheckbox && item.selected ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
          {item.name}
        </h3>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {item.quantity} × {fmt(item.unitPrice)} = <span className="font-bold">{fmt(item.quantity * item.unitPrice)}</span>
        </span>

        {/* Assignment badges */}
        {people.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {assignedPeople.length === 0 ? (
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                👥 {t.shared}
              </span>
            ) : (
              assignedPeople.map(person => (
                <span
                  key={person.id}
                  className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded"
                >
                  {person.name}
                </span>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors text-sm font-medium"
          >
            {t.edit}
          </button>
          <button
            onClick={onDelete}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
          >
            {t.delete}
          </button>
        </div>
        {item.includeInTax && <span title="Taxed" className="text-sm">🧾</span>}
      </div>
    </div>
  )
}
