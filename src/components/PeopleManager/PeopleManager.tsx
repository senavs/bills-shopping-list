import { useState } from 'react'
import type { Person } from '../../types'
import { useLanguage } from '../../contexts/LanguageContext'
import { ChevronRightIcon } from '../shared/icons'

interface PeopleManagerProps {
  people: Person[]
  onAddPerson: (name: string) => void
  onRemovePerson: (personId: string) => void
}

export const PeopleManager = ({ people, onAddPerson, onRemovePerson }: PeopleManagerProps) => {
  const { t } = useLanguage()
  const [newName, setNewName] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    onAddPerson(trimmed)
    setNewName('')
  }

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="flex items-center gap-2 min-h-[44px] pl-1 pr-3"
      >
        <ChevronRightIcon className={`w-4 h-4 text-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        <span className="text-callout font-semibold text-ink">{t.people}</span>
        <span className="text-callout num text-muted">{people.length}</span>
      </button>

      {isExpanded && (
        <div className="bg-surface rounded-group p-3">
          {people.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {people.map(person => (
                <span
                  key={person.id}
                  className="inline-flex items-center gap-1 pl-3 bg-accent/15 text-accent rounded-full text-sm"
                >
                  {person.name}
                  <button
                    onClick={() => onRemovePerson(person.id)}
                    className="w-9 h-9 flex items-center justify-center text-accent hover:text-danger font-bold rounded-full hover:bg-accent/15"
                    aria-label={t.removePerson.replace('{name}', person.name)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t.addPerson}
              autoCapitalize="words"
              autoComplete="off"
              enterKeyHint="done"
              className="flex-1 min-w-0 px-3 py-2 border border-hairline rounded bg-surface text-ink text-base"
            />
            <button
              type="submit"
              disabled={!newName.trim()}
              className="px-4 min-h-[44px] bg-accent text-on-accent rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t.add}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
