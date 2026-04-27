import { Link } from 'react-router-dom'
import type { List } from '../../types'

interface ListCardProps {
  list: List
  onArchive: () => void
  onDelete: () => void
  onDuplicate: () => void
}

export const ListCard = ({ list, onArchive, onDelete, onDuplicate }: ListCardProps) => {
  const icon = list.type === 'shopping' ? '🛒' : '🍽️'
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{list.name}</h3>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{list.currency}</span>
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        {list.items.length} {list.items.length === 1 ? 'item' : 'items'}
      </p>
      
      <div className="flex gap-2 flex-wrap">
        <Link
          to={`/lists/${list.id}/edit`}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          Edit
        </Link>
        {!list.archived && (
          <button
            onClick={onArchive}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Archive
          </button>
        )}
        <button
          onClick={onDuplicate}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          Duplicate
        </button>
        <button
          onClick={onDelete}
          className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
