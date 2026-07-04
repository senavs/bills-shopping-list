import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { List } from '../../types'
import { useLanguage } from '../../contexts/LanguageContext'
import { BottomSheet, type BottomSheetAction } from '../shared/BottomSheet'
import { ConfirmDialog } from '../shared/ConfirmDialog'

interface TemplateCardProps {
  template: List
  onUseTemplate: () => void
  onDelete: () => void
}

export const TemplateCard = ({ template, onUseTemplate, onDelete }: TemplateCardProps) => {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const icon = template.type === 'shopping' ? '🛒' : '🍽️'
  const [showSheet, setShowSheet] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'useTemplate' | 'delete' | null>(null)

  const actions: BottomSheetAction[] = [
    { id: 'useTemplate', label: t.useTemplate, icon: '📋', onAction: () => setConfirmAction('useTemplate') },
    { id: 'edit', label: t.edit, icon: '✏️', onAction: () => navigate(`/lists/${template.id}/edit`) },
    { id: 'delete', label: t.delete, icon: '🗑️', variant: 'destructive' as const, onAction: () => setConfirmAction('delete') },
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
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-200 relative">
        <Link to={`/lists/${template.id}`} className="block">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 pr-8">
                {template.name}
              </h3>
            </div>
            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
              {t.template}
            </span>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300">
            {template.items.length} {template.items.length === 1 ? t.item : t.items}
            {template.sections.length > 0 && ` • ${template.sections.length} ${t.sections}`}
          </p>
        </Link>

        {/* More options button */}
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
