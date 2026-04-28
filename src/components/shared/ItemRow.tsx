import type { Item } from '../../types'

interface ItemRowProps {
  item: Item
  index: number
  totalItems: number
  currency: string
  isDragOver: boolean
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onToggleSelected: (selected: boolean) => void
  onEdit: () => void
  onDelete: () => void
}

export const ItemRow = ({
  item, index, totalItems, currency, isDragOver,
  onDragStart, onDragOver, onDrop, onDragEnd,
  onMoveUp, onMoveDown, onToggleSelected, onEdit, onDelete,
}: ItemRowProps) => (
  <div
    draggable
    onDragStart={onDragStart}
    onDragOver={onDragOver}
    onDrop={onDrop}
    onDragEnd={onDragEnd}
    className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow flex items-center gap-3 transition-opacity ${isDragOver ? 'opacity-50 border-2 border-blue-400' : 'opacity-100'}`}
  >
    <span className="hidden sm:inline cursor-grab text-gray-400 dark:text-gray-500 select-none text-lg leading-none" aria-hidden="true">⠿</span>

    <div className="flex sm:hidden flex-col gap-0.5">
      <button onClick={onMoveUp} disabled={index === 0} aria-label={`Move ${item.name} up`} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 text-xl p-2 leading-none">▲</button>
      <button onClick={onMoveDown} disabled={index === totalItems - 1} aria-label={`Move ${item.name} down`} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 text-xl p-2 leading-none">▼</button>
    </div>

    <input
      type="checkbox"
      checked={item.selected}
      onChange={(e) => onToggleSelected(e.target.checked)}
      className="w-5 h-5 shrink-0"
    />

    <div className="flex-1 min-w-0">
      <h3 className={`font-medium truncate ${item.selected ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
        {item.name}
      </h3>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {item.quantity} × {currency === 'BRL' ? 'R$' : '$'} {item.unitPrice.toFixed(2)} = <span className="font-bold">{currency === 'BRL' ? 'R$' : '$'} {(item.quantity * item.unitPrice).toFixed(2)}</span>
      </span>
    </div>

    <div className="flex flex-col items-end gap-1 shrink-0">
      <div className="flex gap-2">
        <button onClick={onEdit} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm">Edit</button>
        <button onClick={onDelete} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm">Delete</button>
      </div>
      {item.includeInTax && <span title="Taxed" className="text-sm">🧾</span>}
    </div>
  </div>
)
