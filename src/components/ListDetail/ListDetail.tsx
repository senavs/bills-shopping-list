import { useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useLists } from '../../hooks/useLists'
import { ItemForm } from '../ItemForm/ItemForm'
import { TotalsBar } from '../TotalsBar/TotalsBar'
import type { Item } from '../../types'

export const ListDetail = () => {
  const { id } = useParams<{ id: string }>()
  const { lists, addItem, updateItem, deleteItem, reorderItem } = useLists()
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragIndexRef = useRef<number | null>(null)

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

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (toIndex: number) => {
    if (dragIndexRef.current !== null && dragIndexRef.current !== toIndex) {
      reorderItem(list.id, dragIndexRef.current, toIndex)
    }
    dragIndexRef.current = null
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    dragIndexRef.current = null
    setDragOverIndex(null)
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
            {list.items.map((item, index) => (
              <div
                key={item.id}
                data-index={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow flex items-center gap-3 transition-opacity ${dragOverIndex === index ? 'opacity-50 border-2 border-blue-400' : 'opacity-100'}`}
              >
                <span
                  className="hidden sm:inline cursor-grab text-gray-400 dark:text-gray-500 select-none text-lg leading-none"
                  aria-hidden="true"
                >
                  ⠿
                </span>

                <div className="flex sm:hidden flex-col gap-0.5">
                  <button
                    onClick={() => reorderItem(list.id, index, index - 1)}
                    disabled={index === 0}
                    aria-label={`Move ${item.name} up`}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 text-xl p-2 leading-none"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => reorderItem(list.id, index, index + 1)}
                    disabled={index === list.items.length - 1}
                    aria-label={`Move ${item.name} down`}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 text-xl p-2 leading-none"
                  >
                    ▼
                  </button>
                </div>

                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={(e) => handleToggleSelected(item.id, e.target.checked)}
                  className="w-5 h-5 shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium truncate ${item.selected ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                    {item.name}
                  </h3>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {item.quantity} × {list.currency === 'BRL' ? 'R$' : '$'} {item.unitPrice.toFixed(2)} = <span className="font-bold">{list.currency === 'BRL' ? 'R$' : '$'} {(item.quantity * item.unitPrice).toFixed(2)}</span>
                  </span>
                </div>

                <div className="flex flex-col items-end gap-3 shrink-0">
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
                  <label className="flex items-center text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
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
