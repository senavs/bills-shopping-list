import { useState } from 'react'
import type { Person } from '../../types'

interface PeopleManagerProps {
  people: Person[]
  onAddPerson: (name: string) => void
  onRemovePerson: (personId: string) => void
}

export const PeopleManager = ({ people, onAddPerson, onRemovePerson }: PeopleManagerProps) => {
  const [newName, setNewName] = useState('')
  const [isExpanded, setIsExpanded] = useState(people.length > 0)

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    onAddPerson(trimmed)
    setNewName('')
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        <span>{isExpanded ? '▼' : '▶'}</span>
        <span>People ({people.length})</span>
      </button>

      {isExpanded && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow">
          {people.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {people.map(person => (
                <span
                  key={person.id}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                >
                  {person.name}
                  <button
                    onClick={() => onRemovePerson(person.id)}
                    className="ml-1 text-blue-600 dark:text-blue-300 hover:text-red-600 dark:hover:text-red-400 font-bold"
                    aria-label={`Remove ${person.name}`}
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
              placeholder="Add person..."
              className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <button
              type="submit"
              disabled={!newName.trim()}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
