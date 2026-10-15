import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Item, Person } from '../../types'
import { formatCurrency } from '../../lib/format'
import { formatQuantityWithUnit } from '../../lib/unitTypes'
import { useLanguage } from '../../contexts/LanguageContext'
import { DragHandle } from './DragHandle'
import { BottomSheet, type BottomSheetAction } from './BottomSheet'
import { CheckIcon, CopyIcon, EllipsisIcon, PencilIcon, TrashIcon, UsersIcon } from './icons'

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

/** One row of an inset grouped list; the parent group draws the background and separators */
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
  // Only animate a check the user just made, not checks already there on load
  const [justChecked, setJustChecked] = useState(false)

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
    { id: 'edit', label: t.edit, icon: <PencilIcon />, onAction: () => onEdit() },
    { id: 'duplicate', label: t.duplicateItem, icon: <CopyIcon />, onAction: () => onDuplicate() },
    { id: 'delete', label: t.delete, icon: <TrashIcon />, variant: 'destructive', onAction: () => onDelete() },
  ]

  const isChecked = !hideCheckbox && item.selected

  // The whole row is the tap target: toggles selection, or opens the editor for templates
  const handleRowTap = () => {
    if (reorderMode) return
    if (hideCheckbox) {
      onEdit()
      return
    }
    setJustChecked(!item.selected)
    onToggleSelected(!item.selected)
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`relative flex items-center bg-surface after:absolute after:top-0 after:right-0 after:h-px after:bg-hairline first:after:hidden ${
          hideCheckbox ? 'after:left-4' : 'after:left-[3.75rem]'
        } ${
          isDragging ? 'z-50 shadow-lg rounded-group' : ''
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
          className="flex-1 min-w-0 flex items-center gap-3 pl-4 pr-2 py-2.5 min-h-[56px] text-left active:bg-fill disabled:cursor-default"
        >
          {!hideCheckbox && (
            <span
              aria-hidden="true"
              data-testid="item-check"
              onAnimationEnd={() => setJustChecked(false)}
              className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center ${
                isChecked
                  ? `bg-accent border-accent text-on-accent ${justChecked ? 'animate-check-stamp' : ''}`
                  : 'border-hairline'
              }`}
            >
              {isChecked && <CheckIcon className="w-4 h-4" />}
            </span>
          )}

          <span className="flex-1 min-w-0">
            <span className={`block text-body truncate ${isChecked ? 'line-through text-muted' : 'text-ink'}`}>
              {item.name}
            </span>
            <span className="block text-footnote num text-muted">
              {formatQuantityWithUnit(item.quantity, item.unitType ?? 'unit', locale)} × {fmt(item.unitPrice)}
            </span>

            {/* Assignment badges */}
            {people.length > 0 && (
              <span className="flex flex-wrap gap-1 mt-1">
                {assignedPeople.length === 0 ? (
                  <span className="inline-flex items-center gap-1 text-footnote px-1.5 py-0.5 bg-fill text-muted rounded">
                    <UsersIcon className="w-3.5 h-3.5" /> {t.shared}
                  </span>
                ) : (
                  assignedPeople.map(person => (
                    <span
                      key={person.id}
                      className="text-footnote px-1.5 py-0.5 bg-accent/15 text-accent rounded"
                    >
                      {person.name}
                    </span>
                  ))
                )}
              </span>
            )}
          </span>

          <span className={`shrink-0 text-body num font-semibold ${isChecked ? 'text-muted' : 'text-ink'}`}>
            {fmt(item.quantity * item.unitPrice)}
          </span>
        </button>

        {/* 3-dots menu */}
        {!reorderMode && (
          <button
            type="button"
            onClick={() => setShowSheet(true)}
            className="w-11 h-11 mr-1 flex items-center justify-center rounded-full text-muted hover:bg-fill shrink-0"
            aria-label={t.itemOptions}
          >
            <EllipsisIcon />
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
