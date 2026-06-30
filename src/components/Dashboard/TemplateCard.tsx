import { Link } from 'react-router-dom'
import type { List } from '../../types'
import { useLanguage } from '../../contexts/LanguageContext'

interface TemplateCardProps {
  template: List
  onUseTemplate: () => void
  onDelete: () => void
}

export const TemplateCard = ({ template, onUseTemplate, onDelete }: TemplateCardProps) => {
  const { t } = useLanguage()
  const icon = template.type === 'shopping' ? '🛒' : '🍽️'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow border-l-4 border-green-500">
      <Link to={`/lists/${template.id}`} className="block mb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400">
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

      <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onUseTemplate}
          className="text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
        >
          {t.useTemplate}
        </button>
        <Link
          to={`/lists/${template.id}/edit`}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          {t.edit}
        </Link>
        <button
          onClick={onDelete}
          className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
        >
          {t.delete}
        </button>
      </div>
    </div>
  )
}
