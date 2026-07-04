import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { List } from '../../types'
import { useLanguage } from '../../contexts/LanguageContext'
import { useLongPress } from '../../hooks/useLongPress'
import { BottomSheet, type BottomSheetAction } from '../shared/BottomSheet'
import { ConfirmDialog } from '../shared/ConfirmDialog'

interface ListCardProps {
  list: List
  onArchive: () => void
  onUnarchive: () => void
  onDelete: () => void
  onDuplicate: () => void
  onSaveAsTemplate: () => void
}

export const ListCard = ({ list, onArchive, onUnarchive, onDelete, onDuplicate, onSaveAsTemplate }: ListCardProps) => {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const icon = list.type === 'shopping' ? '🛒' : '🍽️'
  const [showSheet, setShowSheet] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'archive' | 'unarchive' | 'duplicate' | 'template' | 'delete' | null>(null)

  const { handlers, isLongPress } = useLongPress({
    onLongPress: () => setShowSheet(true),
  })

  const handleCardClick = (e: React.MouseEvent) => {
    // If long press triggered, don't navigate
    if (isLongPress.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const actions: BottomSheetAction[] = [
    { id: 'open', label: t.openList, icon: '📋', onAction: () => navigate(`/lists/${list.id}`) },
    { id: 'edit', label: t.edit, icon: '✏️', onAction: () => navigate(`/lists/${list.id}/edit`) },
    { id: 'duplicate', label: t.duplicate, icon: '📑', onAction: () => setConfirmAction('duplicate') },
    { id: 'template', label: t.template, icon: '📌', onAction: () => setConfirmAction('template') },
    ...(!list.archived
      ? [{ id: 'archive', label: t.archive, icon: '📦', onAction: () => setConfirmAction('archive') }]
      : [{ id: 'unarchive', label: t.unarchive, icon: '📤', onAction: () => setConfirmAction('unarchive') }]
    ),
    { id: 'delete', label: t.delete, icon: '🗑️', variant: 'destructive' as const, onAction: () => setConfirmAction('delete') },
  ]

  const handleConfirm = () => {
    switch (confirmAction) {
      case 'archive': onArchive(); break
      case 'unarchive': onUnarchive(); break
      case 'duplicate': onDuplicate(); break
      case 'template': onSaveAsTemplate(); break
      case 'delete': onDelete(); break
    }
    setConfirmAction(null)
  }

  const getConfirmProps = () => {
    switch (confirmAction) {
      case 'archive': return { title: t.archiveListTitle, message: t.archiveListMessage, variant: 'info' as const, confirmLabel: t.archiveConfirm }
      case 'unarchive': return { title: t.unarchiveListTitle, message: t.unarchiveListMessage, variant: 'info' as const, confirmLabel: t.unarchiveConfirm }
      case 'duplicate': return { title: t.duplicateListTitle, message: t.duplicateListMessage, variant: 'info' as const, confirmLabel: t.duplicateConfirm }
      case 'template': return { title: t.saveAsTemplateTitle, message: t.saveAsTemplateMessage, variant: 'info' as const, confirmLabel: t.templateConfirm }
      case 'delete': return { title: t.deleteList, message: t.deleteListMessage, variant: 'destructive' as const, confirmLabel: t.confirm }
      default: return { title: '', message: '', variant: 'info' as const, confirmLabel: '' }
    }
  }

  const confirmProps = getConfirmProps()

  return (
    <>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98] cursor-pointer relative select-none"
        {...handlers}
      >
        <Link
          to={`/lists/${list.id}`}
          className="block"
          onClick={handleCardClick}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-8">
                {list.name}
              </h3>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300">
            {list.items.length} {list.items.length === 1 ? t.item : t.items}
          </p>
        </Link>

        {/* More options button (alternative to long press) */}
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowSheet(true) }}
          className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="More options"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="10" cy="4" r="2" />
            <circle cx="10" cy="10" r="2" />
            <circle cx="10" cy="16" r="2" />
          </svg>
        </button>
      </div>

      <BottomSheet
        isOpen={showSheet}
        title={list.name}
        actions={actions}
        onClose={() => setShowSheet(false)}
      />

      <ConfirmDialog
        isOpen={confirmAction !== null}
        title={confirmProps.title}
        message={confirmProps.message}
        variant={confirmProps.variant}
        confirmLabel={confirmProps.confirmLabel}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  )
}
