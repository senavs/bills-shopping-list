import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { List } from '../../types'
import { useLanguage } from '../../contexts/LanguageContext'
import { useSync } from '../../contexts/SyncContext'
import { useSharedSync } from '../../contexts/SharedSyncContext'
import { formatCurrency } from '../../lib/format'
import { calcTotals } from '../../lib/calculations'
import { useLongPress } from '../../hooks/useLongPress'
import { BottomSheet, type BottomSheetAction } from '../shared/BottomSheet'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { ArchiveIcon, BookmarkIcon, CopyIcon, EllipsisIcon, OpenIcon, PencilIcon, TrashIcon, UnarchiveIcon, UsersIcon } from '../shared/icons'

interface ListCardProps {
  list: List
  activeTab: 'active' | 'archived' | 'templates'
  onArchive: () => void
  onUnarchive: () => void
  onDelete: () => void
  onDuplicate: () => void
  onSaveAsTemplate: () => void
}

export const ListCard = ({ list, activeTab, onArchive, onUnarchive, onDelete, onDuplicate, onSaveAsTemplate }: ListCardProps) => {
  const { t, locale } = useLanguage()
  const navigate = useNavigate()
  const icon = { shopping: '🛒', restaurant: '🍽️', bar: '🍻' }[list.type] || '🛒'
  // Same figure the list's totals bar calls "Total" (tax/tip included)
  const total = calcTotals(list).totalAllWithTax
  const [showSheet, setShowSheet] = useState(false)
  const { uid } = useSync()
  // Shared lists: members leave, the owner deletes for everyone
  const role = useSharedSync().roleOf(list.id)
  const deleteLabel = role === 'member' ? t.leaveList : role === 'owner' ? t.deleteForEveryone : t.delete
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
    { id: 'open', label: t.openList, icon: <OpenIcon />, onAction: () => navigate(`/lists/${list.id}`, { state: { activeTab, from: '/app' } }) },
    { id: 'edit', label: t.edit, icon: <PencilIcon />, onAction: () => navigate(`/lists/${list.id}/edit`, { state: { activeTab, from: '/app' } }) },
    { id: 'duplicate', label: t.duplicate, icon: <CopyIcon />, onAction: () => setConfirmAction('duplicate') },
    { id: 'template', label: t.template, icon: <BookmarkIcon />, onAction: () => setConfirmAction('template') },
    ...(!list.archived
      ? [{ id: 'archive', label: t.archive, icon: <ArchiveIcon />, onAction: () => setConfirmAction('archive') }]
      : [{ id: 'unarchive', label: t.unarchive, icon: <UnarchiveIcon />, onAction: () => setConfirmAction('unarchive') }]
    ),
    { id: 'delete', label: deleteLabel, icon: <TrashIcon />, variant: 'destructive' as const, onAction: () => setConfirmAction('delete') },
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
      case 'delete': return {
        title: deleteLabel === t.delete ? t.deleteList : deleteLabel,
        message: role === 'member' ? t.leaveListMessage : role === 'owner' ? t.deleteForEveryoneMessage : t.deleteListMessage,
        variant: 'destructive' as const,
        confirmLabel: t.confirm,
      }
      default: return { title: '', message: '', variant: 'info' as const, confirmLabel: '' }
    }
  }

  const confirmProps = getConfirmProps()

  return (
    <>
      <div
        className={`relative flex items-center bg-surface active:bg-fill no-callout after:absolute after:top-0 after:right-0 after:left-[4.25rem] after:h-px after:bg-hairline first:after:hidden ${list.archived ? 'opacity-80' : ''}`}
        {...handlers}
      >
        <Link
          to={`/lists/${list.id}`}
          state={{ activeTab, from: '/app' }}
          className="flex-1 min-w-0 flex items-center gap-3 pl-4 py-3 min-h-[64px]"
          onClick={handleCardClick}
        >
          <span className="relative shrink-0 w-10 h-10 rounded-full bg-fill flex items-center justify-center text-xl">
            <span aria-hidden="true">{icon}</span>
            {list.shared && (
              <span
                role="img"
                aria-label={t.sharedBadge}
                title={t.sharedBadge}
                className="absolute -bottom-0.5 -right-1 w-5 h-5 rounded-full bg-accent text-on-accent ring-2 ring-surface flex items-center justify-center"
              >
                <UsersIcon className="w-3.5 h-3.5" />
              </span>
            )}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-body font-semibold text-ink truncate">{list.name}</span>
            <span className="block text-footnote text-muted truncate">
              {list.items.length} {list.items.length === 1 ? t.item : t.items}
              {list.sections.length > 0 && `, ${list.sections.length} ${t.sections}`}
            </span>
            {list.shared && !uid && (
              <span className="block text-footnote text-muted truncate">{t.sharedSignInToSync}</span>
            )}
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-footnote text-muted">{t.total}</span>
            <span className="block text-callout num font-semibold text-ink">{formatCurrency(total, list.currency, locale)}</span>
          </span>
        </Link>

        {/* More options button (alternative to long press) */}
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowSheet(true) }}
          className="shrink-0 w-11 h-11 mr-1 flex items-center justify-center rounded-full text-muted hover:bg-fill"
          aria-label={t.moreOptions}
        >
          <EllipsisIcon />
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
