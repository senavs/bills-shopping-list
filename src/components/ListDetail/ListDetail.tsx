import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useLists } from '../../hooks/useLists'
import { ItemForm } from '../ItemForm/ItemForm'
import { TotalsBar } from '../TotalsBar/TotalsBar'
import type { Item } from '../../types'

export const ListDetail = () => {
  const { id } = useParams<{ id: string }>()
  const { lists, addItem, updateItem, deleteItem } = useLists()
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)

  const list = lists.find(l => l.id === id)

  if (!list) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">List not found</p>
          <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const handleAddItem = (item: Omit<Item, 'id'>) => {
    addItem(list.id, item)
    setShowForm(false)
  }

  const handleEditItem = (item: Omit<Item, 'id'>) => {
    if (editingItem) {
      updateItem(list.id, editingItem.id, item)
      setEditingItem(null)
    }
  }

  const handleToggleSelected = (itemId: string, selected: boolean) => {
    updateItem(list.id, itemId, { selected })
  }

  const handleToggleIncludeInTax = (itemId: string, includeInTax: boolean) => {
    updateItem(list.id, itemId, { includeInTax })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-2 block">
              ← Back
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {list.name}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {list.type === 'shopping' ? '🛒' : '🍽️'} {list.type} • {list.currency}
            </p>
          </div>
        </div>

        {list.items.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No items yet. Tap the + button to add one.
          </div>
        ) : (
          <div className="space-y-2 mb-32">
            {list.items.map(item => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow flex items-center gap-3"
              >
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={(e) => handleToggleSelected(item.id, e.target.checked)}
                  className="w-5 h-5"
                />
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-medium ${item.selected ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                      {item.name}
                    </h3>
                    <span className="text-gray-900 dark:text-white font-semibold">
                      {list.currency} {(item.quantity * item.unitPrice).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {item.quantity} × {list.currency} {item.unitPrice.toFixed(2)}
                    </span>
                    <label className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={item.includeInTax}
                        onChange={(e) => handleToggleIncludeInTax(item.id, e.target.checked)}
                        className="mr-1"
                      />
                      Tax
                    </label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteItem(list.id, item.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center text-2xl z-10"
        >
          +
        </button>
      </div>

      <TotalsBar list={list} />

      {showForm && (
        <ItemForm
          onSubmit={handleAddItem}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingItem && (
        <ItemForm
          item={editingItem}
          onSubmit={handleEditItem}
          onCancel={() => setEditingItem(null)}
        />
      )}
    </div>
  )
}
