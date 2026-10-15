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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div role="dialog" aria-modal="true" aria-label={initialName ? t.renameSection : t.newSection} className="bg-surface rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-xl">
        <h3 className="text-lg font-semibold text-ink mb-4">
          {initialName ? t.renameSection : t.newSection}
        </h3>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-danger/10 text-danger rounded text-sm">
              {error}
            </div>
          )}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 border border-hairline rounded-xl bg-surface text-ink mb-4"
            placeholder={t.sectionNamePlaceholder}
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onCancel} className="px-5 py-3 min-h-[44px] text-ink hover:bg-fill rounded-xl">
              {t.cancel}
            </button>
            <button type="submit" className="px-5 py-3 min-h-[44px] bg-accent text-on-accent active:opacity-80 rounded-xl">
              {initialName ? t.save : t.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
