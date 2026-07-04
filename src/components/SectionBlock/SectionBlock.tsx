import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Section, Item, List, Person } from '../../types'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { SectionForm } from '../SectionForm/SectionForm'
import { SectionItemsModal } from '../SectionItemsModal/SectionItemsModal'
import { ItemRow } from '../shared/ItemRow'
import { SortableContainer } from '../shared/SortableContainer'
import { DragHandle } from '../shared/DragHandle'
import { useLanguage } from '../../contexts/LanguageContext'

interface SectionBlockProps {
  section: Section
  list: List
  hideCheckbox?: boolean
  people?: Person[]
  onUpdateSection: (sectionId: string, updates: Partial<Section>) => void
  onDeleteSection: (sectionId: string) => void
  onReorderItemInSection: (sectionId: string, fromIndex: number, toIndex: number) => void
  onEditItem: (item: Item) => void
  onDeleteItem: (itemId: string) => void
  onToggleSelected: (itemId: string, selected: boolean) => void
}

export const SectionBlock = ({
  section, list, hideCheckbox, people,
  onUpdateSection, onDeleteSection, onReorderItemInSection,
  onEditItem, onDeleteItem, onToggleSelected,
}: SectionBlockProps) => {
  const { t } = useLanguage()
  const [showRename, setShowRename] = useState(false)
  const [showItemsModal, setShowItemsModal] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Section is sortable (draggable by its handle)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const sectionItems = section.itemIds
    .map(id => list.items.find(i => i.id === id))
    .filter((i): i is Item => !!i)

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

  const handleItemReorder = (fromIndex: number, toIndex: number) => {
    onReorderItemInSection(section.id, fromIndex, toIndex)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'opacity-50 z-50' : ''}`}
    >
      {/* Section header row */}
      <div
        className={`flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl border-l-4 border-blue-500 transition-all ${
          isDragging ? 'shadow-lg ring-2 ring-blue-400/50' : ''
        }`}
      >
        <DragHandle listeners={listeners} attributes={attributes} />

        {/* Collapse toggle */}
        <button
          onClick={() => onUpdateSection(section.id, { collapsed: !section.collapsed })}
          aria-label={section.collapsed ? 'Expand section' : 'Collapse section'}
          className="w-9 h-9 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          {section.collapsed ? '▶' : '▼'}
        </button>

        <span className="flex-1 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
          {section.name}
          <span className="ml-2 text-xs font-normal normal-case text-gray-500 dark:text-gray-400">
            ({sectionItems.length})
          </span>
        </span>

        <button
          onClick={() => setShowItemsModal(true)}
          className="min-h-[44px] px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors text-sm font-medium"
        >
          {t.edit}
        </button>
        <button
          onClick={() => setShowRename(true)}
          className="min-h-[44px] px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium"
        >
          {t.rename}
        </button>
        <button
          onClick={() => setShowConfirm(true)}
          className="min-h-[44px] px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
        >
          {t.delete}
        </button>
      </div>

      {/* Section items with dnd-kit */}
      {!section.collapsed && sectionItems.length > 0 && (
        <div className="pl-4 mt-1 space-y-1">
          <SortableContainer
            items={sectionItems.map(i => i.id)}
            onReorder={handleItemReorder}
          >
            {sectionItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                currency={list.currency}
                hideCheckbox={hideCheckbox}
                people={people}
                onToggleSelected={(selected) => onToggleSelected(item.id, selected)}
                onEdit={() => onEditItem(item)}
                onDelete={() => onDeleteItem(item.id)}
              />
            ))}
          </SortableContainer>
        </div>
      )}

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
        title={t.deleteSection}
        message={`${t.delete} "${section.name}"? ${t.deleteSectionMsg}`}
        onConfirm={() => { onDeleteSection(section.id); setShowConfirm(false) }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  )
}
