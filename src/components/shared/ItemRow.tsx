import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Item, Person } from '../../types'
import { formatCurrency } from '../../lib/format'
import { formatQuantityWithUnit } from '../../lib/unitTypes'
import { useLanguage } from '../../contexts/LanguageContext'
import { DragHandle } from './DragHandle'
import { BottomSheet, type BottomSheetAction } from './BottomSheet'

interface ItemRowProps {
  item: Item
  currency: string
  hideCheckbox?: boolean
  people?: Person[]
  /** Reorder mode: shows the drag handle and disables tap-to-toggle */
  reorderMode?: boolean
  onToggleSelected: (selected: boolean) => void
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
}

export const ItemRow = ({
  item, currency, hideCheckbox, people = [], reorderMode = false,
  onToggleSelected, onEdit, onDelete, onDuplicate,
}: ItemRowProps) => {
  const { locale, t } = useLanguage()
  const fmt = (amount: number) => formatCurrency(amount, currency, locale)
  const assignedPeople = (item.assignedTo || [])
    .map(id => people.find(p => p.id === id))
    .filter((p): p is Person => !!p)
  const [showSheet, setShowSheet] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !reorderMode })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Deleting is undoable through the toast, so no confirmation step here
  const actions: BottomSheetAction[] = [
    { id: 'edit', label: t.edit, icon: '✏️', onAction: () => onEdit() },
    { id: 'duplicate', label: t.duplicateItem, icon: '📋', onAction: () => onDuplicate() },
    { id: 'delete', label: t.delete, icon: '🗑️', variant: 'destructive', onAction: () => onDelete() },
  ]

  const isChecked = !hideCheckbox && item.selected

  // The whole row is the tap target: toggles selection, or opens the editor for templates
  const handleRowTap = () => {
    if (reorderMode) return
    if (hideCheckbox) onEdit()
    else onToggleSelected(!item.selected)
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center transition-shadow ${
          isDragging ? 'shadow-lg ring-2 ring-blue-400/50 opacity-90 z-50' : ''
        }`}
      >
        {reorderMode && (
          <DragHandle listeners={listeners} attributes={attributes} className="ml-1" />
        )}

        <button
          type="button"
          onClick={handleRowTap}
          disabled={reorderMode}
          {...(hideCheckbox
            ? { 'aria-label': `${t.edit} ${item.name}` }
            : { role: 'checkbox', 'aria-checked': item.selected })}
          className="flex-1 min-w-0 flex items-center gap-3 pl-3 py-2.5 min-h-[56px] text-left rounded-xl active:bg-gray-50 dark:active:bg-gray-700/50 disabled:cursor-default"
        >
          {!hideCheckbox && (
            <span
              aria-hidden="true"
              data-testid="item-check"
              className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                isChecked
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-gray-300 dark:border-gray-500'
              }`}
            >
              {isChecked && (
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              )}
            </span>
          )}

          <span className="flex-1 min-w-0">
            <span className={`block font-medium truncate ${isChecked ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
              {item.name}
            </span>
            <span className="block text-sm font-semibold text-gray-600 dark:text-gray-400">
              {formatQuantityWithUnit(item.quantity, item.unitType ?? 'unit', locale)} × {fmt(item.unitPrice)} = {fmt(item.quantity * item.unitPrice)}
            </span>

            {/* Assignment badges */}
            {people.length > 0 && (
              <span className="flex flex-wrap gap-1 mt-1">
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
              </span>
            )}
          </span>
        </button>

        {/* 3-dots menu */}
        {!reorderMode && (
          <button
            type="button"
            onClick={() => setShowSheet(true)}
            className="w-11 h-11 mr-1 flex items-center justify-center rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
            aria-label={t.itemOptions}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <circle cx="10" cy="4" r="2" />
              <circle cx="10" cy="10" r="2" />
              <circle cx="10" cy="16" r="2" />
            </svg>
          </button>
        )}
      </div>

      <BottomSheet
        isOpen={showSheet}
        title={item.name}
        actions={actions}
        onClose={() => setShowSheet(false)}
      />
    </>
  )
}
