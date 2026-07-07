import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Item, Person } from '../../types'
import { formatCurrency } from '../../lib/format'
import { formatQuantityWithUnit } from '../../lib/unitTypes'
import { useLanguage } from '../../contexts/LanguageContext'
import { DragHandle } from './DragHandle'
import { BottomSheet, type BottomSheetAction } from './BottomSheet'
import { ConfirmDialog } from './ConfirmDialog'

interface ItemRowProps {
  item: Item
  currency: string
  hideCheckbox?: boolean
  people?: Person[]
  onToggleSelected: (selected: boolean) => void
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
}

export const ItemRow = ({
  item, currency, hideCheckbox, people = [],
  onToggleSelected, onEdit, onDelete, onDuplicate,
}: ItemRowProps) => {
  const { locale, t } = useLanguage()
  const fmt = (amount: number) => formatCurrency(amount, currency, locale)
  const assignedPeople = (item.assignedTo || [])
    .map(id => people.find(p => p.id === id))
    .filter((p): p is Person => !!p)
  const [showSheet, setShowSheet] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

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

  const actions: BottomSheetAction[] = [
    { id: 'edit', label: t.edit, icon: '✏️', onAction: () => onEdit() },
    { id: 'duplicate', label: t.duplicateItem, icon: '📋', onAction: () => onDuplicate() },
    { id: 'delete', label: t.delete, icon: '🗑️', variant: 'destructive', onAction: () => setConfirmDelete(true) },
  ]

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-1.5 transition-shadow ${
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
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            {formatQuantityWithUnit(item.quantity, item.unitType ?? 'unit', locale)} × {fmt(item.unitPrice)} = {fmt(item.quantity * item.unitPrice)}
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

        {/* 3-dots menu */}
        <button
          onClick={() => setShowSheet(true)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
          aria-label="Item options"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="10" cy="4" r="2" />
            <circle cx="10" cy="10" r="2" />
            <circle cx="10" cy="16" r="2" />
          </svg>
        </button>
      </div>

      <BottomSheet
        isOpen={showSheet}
        title={item.name}
        actions={actions}
        onClose={() => setShowSheet(false)}
      />

      <ConfirmDialog
        isOpen={confirmDelete}
        title={t.deleteItemTitle}
        message={t.deleteItemMessage}
        variant="destructive"
        confirmLabel={t.confirm}
        onConfirm={() => { setConfirmDelete(false); onDelete() }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
