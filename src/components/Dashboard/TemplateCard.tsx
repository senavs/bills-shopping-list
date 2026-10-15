import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { List } from '../../types'
import { useLanguage } from '../../contexts/LanguageContext'
import { BottomSheet, type BottomSheetAction } from '../shared/BottomSheet'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { EllipsisIcon, OpenIcon, PencilIcon, TrashIcon } from '../shared/icons'

interface TemplateCardProps {
  template: List
  activeTab: 'active' | 'archived' | 'templates'
  onUseTemplate: () => void
  onDelete: () => void
}

export const TemplateCard = ({ template, activeTab, onUseTemplate, onDelete }: TemplateCardProps) => {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const icon = { shopping: '🛒', restaurant: '🍽️', bar: '🍻' }[template.type] || '🛒'
  const [showSheet, setShowSheet] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'useTemplate' | 'delete' | null>(null)

  const actions: BottomSheetAction[] = [
    { id: 'useTemplate', label: t.useTemplate, icon: <OpenIcon />, onAction: () => setConfirmAction('useTemplate') },
    { id: 'edit', label: t.edit, icon: <PencilIcon />, onAction: () => navigate(`/lists/${template.id}/edit`, { state: { activeTab, from: '/app' } }) },
    { id: 'delete', label: t.delete, icon: <TrashIcon />, variant: 'destructive' as const, onAction: () => setConfirmAction('delete') },
  ]

  const handleConfirm = () => {
    switch (confirmAction) {
      case 'useTemplate': onUseTemplate(); break
      case 'delete': onDelete(); break
    }
    setConfirmAction(null)
  }

  const getConfirmProps = () => {
    switch (confirmAction) {
      case 'useTemplate': return { title: t.useTemplateTitle, message: t.useTemplateMessage, variant: 'info' as const, confirmLabel: t.useTemplateConfirm }
      case 'delete': return { title: t.deleteTemplate, message: t.deleteTemplateMessage, variant: 'destructive' as const, confirmLabel: t.confirm }
      default: return { title: '', message: '', variant: 'info' as const, confirmLabel: '' }
    }
  }

  const confirmProps = getConfirmProps()

  return (
    <>
      <div className="relative flex items-center bg-surface active:bg-fill no-callout after:absolute after:top-0 after:right-0 after:left-[4.25rem] after:h-px after:bg-hairline first:after:hidden">
        <Link
          to={`/lists/${template.id}`}
          state={{ activeTab, from: '/app' }}
          className="flex-1 min-w-0 flex items-center gap-3 pl-4 py-3 min-h-[64px]"
        >
          <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-full bg-fill flex items-center justify-center text-xl">
            {icon}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-body font-semibold text-ink truncate">{template.name}</span>
            <span className="block text-footnote text-muted truncate">
              {template.items.length} {template.items.length === 1 ? t.item : t.items}
              {template.sections.length > 0 && `, ${template.sections.length} ${t.sections}`}
            </span>
          </span>
        </Link>

        {/* More options button */}
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
        title={template.name}
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
