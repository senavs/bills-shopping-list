import { useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useScrollLock } from '../../hooks/useScrollLock'

interface SectionFormProps {
  initialName?: string
  onSubmit: (name: string) => void
  onCancel: () => void
}

export const SectionForm = ({ initialName = '', onSubmit, onCancel }: SectionFormProps) => {
  const { t } = useLanguage()
  useScrollLock(true)
  const [name, setName] = useState(initialName)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError(t.nameRequired); return }
    onSubmit(trimmed)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-t-lg sm:rounded-lg p-6 w-full sm:max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {initialName ? t.renameSection : t.newSection}
        </h3>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded text-sm">
              {error}
            </div>
          )}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
            placeholder={t.sectionNamePlaceholder}
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onCancel} className="px-5 py-3 min-h-[44px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              {t.cancel}
            </button>
            <button type="submit" className="px-5 py-3 min-h-[44px] bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-colors">
              {initialName ? t.save : t.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
