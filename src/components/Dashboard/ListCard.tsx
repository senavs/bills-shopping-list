import { Link } from 'react-router-dom'
import type { List } from '../../types'

interface ListCardProps {
  list: List
  onArchive: () => void
  onUnarchive: () => void
  onDelete: () => void
  onDuplicate: () => void
}

export const ListCard = ({ list, onArchive, onUnarchive, onDelete, onDuplicate }: ListCardProps) => {
  const icon = list.type === 'shopping' ? '🛒' : '🍽️'
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      <Link to={`/lists/${list.id}`} className="block mb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
              {list.name}
            </h3>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{list.currency}</span>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {list.items.length} {list.items.length === 1 ? 'item' : 'items'}
        </p>
      </Link>
      
      <div className="flex gap-2 flex-wrap pt-3 border-t border-gray-200 dark:border-gray-700">
        <Link
          to={`/lists/${list.id}/edit`}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          Edit
        </Link>
        {!list.archived ? (
          <button
            onClick={onArchive}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Archive
          </button>
        ) : (
          <button
            onClick={onUnarchive}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            Unarchive
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
