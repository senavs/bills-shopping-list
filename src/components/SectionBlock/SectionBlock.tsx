import { useState, useRef } from 'react'
import type { Section, Item, List } from '../../types'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { SectionForm } from '../SectionForm/SectionForm'
import { SectionItemsModal } from '../SectionItemsModal/SectionItemsModal'
import { ItemRow } from '../shared/ItemRow'

interface SectionBlockProps {
  section: Section
  sectionIndex: number
  totalSections: number
  list: List
  onUpdateSection: (sectionId: string, updates: Partial<Section>) => void
  onDeleteSection: (sectionId: string) => void
  onReorderSection: (fromIndex: number, toIndex: number) => void
  onReorderItemInSection: (sectionId: string, fromIndex: number, toIndex: number) => void
  onEditItem: (item: Item) => void
  onDeleteItem: (itemId: string) => void
  onToggleSelected: (itemId: string, selected: boolean) => void
  // drag-and-drop for section reorder
  onSectionDragStart: (index: number) => void
  onSectionDragOver: (e: React.DragEvent, index: number) => void
  onSectionDrop: (toIndex: number) => void
  onSectionDragEnd: () => void
  isDragOver: boolean
}

export const SectionBlock = ({
  section, sectionIndex, totalSections, list,
  onUpdateSection, onDeleteSection, onReorderSection, onReorderItemInSection,
  onEditItem, onDeleteItem, onToggleSelected,
  onSectionDragStart, onSectionDragOver, onSectionDrop, onSectionDragEnd, isDragOver,
}: SectionBlockProps) => {
  const [showRename, setShowRename] = useState(false)
  const [showItemsModal, setShowItemsModal] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [itemDragOver, setItemDragOver] = useState<number | null>(null)
  const itemDragRef = useRef<number | null>(null)

  const sectionItems = section.itemIds
    .map(id => list.items.find(i => i.id === id))
    .filter((i): i is Item => !!i)

  // Items in other sections (unavailable for this section's modal)
  const unavailableItemIds = list.sections
    .filter(s => s.id !== section.id)
    .flatMap(s => s.itemIds)

  const handleSaveItems = (selectedIds: string[]) => {
    onUpdateSection(section.id, { itemIds: selectedIds })
    setShowItemsModal(false)
  }

  const handleRename = (name: string) => {
    onUpdateSection(section.id, { name })
    setShowRename(false)
  }

  const handleItemDragStart = (index: number) => { itemDragRef.current = index }
  const handleItemDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setItemDragOver(index) }
  const handleItemDrop = (toIndex: number) => {
    if (itemDragRef.current !== null && itemDragRef.current !== toIndex) {
      onReorderItemInSection(section.id, itemDragRef.current, toIndex)
    }
    itemDragRef.current = null
    setItemDragOver(null)
  }
  const handleItemDragEnd = () => { itemDragRef.current = null; setItemDragOver(null) }

  return (
    <>
      {/* Section header row */}
      <div
        draggable
        onDragStart={() => onSectionDragStart(sectionIndex)}
        onDragOver={(e) => onSectionDragOver(e, sectionIndex)}
        onDrop={() => onSectionDrop(sectionIndex)}
        onDragEnd={onSectionDragEnd}
        className={`flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border-l-4 border-blue-500 transition-opacity ${isDragOver ? 'opacity-50 border-2 border-blue-400' : 'opacity-100'}`}
      >
        {/* Desktop drag handle */}
        <span className="hidden sm:inline cursor-grab text-gray-400 dark:text-gray-500 select-none text-lg leading-none" aria-hidden="true">⠿</span>

        {/* Mobile reorder buttons */}
        <div className="flex sm:hidden flex-col gap-0.5">
          <button onClick={() => onReorderSection(sectionIndex, sectionIndex - 1)} disabled={sectionIndex === 0} aria-label="Move section up" className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 text-xl p-1 leading-none">▲</button>
          <button onClick={() => onReorderSection(sectionIndex, sectionIndex + 1)} disabled={sectionIndex === totalSections - 1} aria-label="Move section down" className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 text-xl p-1 leading-none">▼</button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => onUpdateSection(section.id, { collapsed: !section.collapsed })}
          aria-label={section.collapsed ? 'Expand section' : 'Collapse section'}
          className="text-gray-500 dark:text-gray-400 text-sm"
        >
          {section.collapsed ? '▶' : '▼'}
        </button>

        <span className="flex-1 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
          {section.name}
          <span className="ml-2 text-xs font-normal normal-case text-gray-500 dark:text-gray-400">
            ({sectionItems.length})
          </span>
        </span>

        <button onClick={() => setShowItemsModal(true)} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm">Edit</button>
        <button onClick={() => setShowRename(true)} className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm">Rename</button>
        <button onClick={() => setShowConfirm(true)} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm">Delete</button>
      </div>

      {/* Section items */}
      {!section.collapsed && sectionItems.map((item, idx) => (
        <div key={item.id} className="pl-6">
          <ItemRow
            item={item}
            index={idx}
            totalItems={sectionItems.length}
            currency={list.currency}
            isDragOver={itemDragOver === idx}
            onDragStart={() => handleItemDragStart(idx)}
            onDragOver={(e) => handleItemDragOver(e, idx)}
            onDrop={() => handleItemDrop(idx)}
            onDragEnd={handleItemDragEnd}
            onMoveUp={() => onReorderItemInSection(section.id, idx, idx - 1)}
            onMoveDown={() => onReorderItemInSection(section.id, idx, idx + 1)}
            onToggleSelected={(selected) => onToggleSelected(item.id, selected)}
            onEdit={() => onEditItem(item)}
            onDelete={() => onDeleteItem(item.id)}
          />
        </div>
      ))}

      {showRename && <SectionForm initialName={section.name} onSubmit={handleRename} onCancel={() => setShowRename(false)} />}

      {showItemsModal && (
        <SectionItemsModal
          allItems={list.items}
          assignedItemIds={section.itemIds}
          unavailableItemIds={unavailableItemIds}
          onSave={handleSaveItems}
          onCancel={() => setShowItemsModal(false)}
        />
      )}

      <ConfirmDialog
        isOpen={showConfirm}
        title="Delete Section"
        message={`Delete "${section.name}"? Items will not be deleted.`}
        onConfirm={() => { onDeleteSection(section.id); setShowConfirm(false) }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}
