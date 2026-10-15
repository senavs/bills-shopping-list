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
import { BottomSheet, type BottomSheetAction } from '../shared/BottomSheet'
import { useLanguage } from '../../contexts/LanguageContext'
import { ChevronRightIcon, EllipsisIcon, ListIcon, PlusIcon, TextIcon, TrashIcon } from '../shared/icons'

interface SectionBlockProps {
  section: Section
  list: List
  hideCheckbox?: boolean
  people?: Person[]
  /** Reorder mode: shows drag handles for the section and its items */
  reorderMode?: boolean
  onUpdateSection: (sectionId: string, updates: Partial<Section>) => void
  onDeleteSection: (sectionId: string) => void
  onReorderItemInSection: (sectionId: string, fromIndex: number, toIndex: number) => void
  onEditItem: (item: Item) => void
  onDeleteItem: (itemId: string) => void
  onDuplicateItem: (itemId: string) => void
  onToggleSelected: (itemId: string, selected: boolean) => void
  onAddItem?: () => void
}

export const SectionBlock = ({
  section, list, hideCheckbox, people, reorderMode = false,
  onUpdateSection, onDeleteSection, onReorderItemInSection,
  onEditItem, onDeleteItem, onDuplicateItem, onToggleSelected, onAddItem,
}: SectionBlockProps) => {
  const { t } = useLanguage()
  const [showRename, setShowRename] = useState(false)
  const [showItemsModal, setShowItemsModal] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSheet, setShowSheet] = useState(false)

  // Section is sortable (draggable by its handle)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, disabled: !reorderMode })

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

  const sectionActions: BottomSheetAction[] = [
    { id: 'edit-items', label: t.edit, icon: <ListIcon />, onAction: () => setShowItemsModal(true) },
    { id: 'rename', label: t.rename, icon: <TextIcon />, onAction: () => setShowRename(true) },
    { id: 'delete', label: t.delete, icon: <TrashIcon />, variant: 'destructive', onAction: () => setShowConfirm(true) },
  ]

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`pt-4 ${isDragging ? 'opacity-60 z-50' : ''}`}
    >
      {/* Section header: sits on the page background above its group, like iOS Settings */}
      <div className="flex items-center gap-1 pl-1">
        {reorderMode && <DragHandle listeners={listeners} attributes={attributes} />}

        {/* Collapse toggle */}
        <button
          onClick={() => onUpdateSection(section.id, { collapsed: !section.collapsed })}
          aria-label={section.collapsed ? t.expandSection : t.collapseSection}
          aria-expanded={!section.collapsed}
          className="flex-1 min-w-0 flex items-center gap-2 min-h-[44px] text-left"
        >
          <ChevronRightIcon className={`w-4 h-4 shrink-0 text-muted transition-transform ${section.collapsed ? '' : 'rotate-90'}`} />
          <span className="text-callout font-semibold text-ink truncate">{section.name}</span>
          <span className="text-callout num text-muted">{sectionItems.length}</span>
        </button>

        {/* Add item to this section */}
        {onAddItem && !reorderMode && (
          <button
            onClick={onAddItem}
            className="w-11 h-11 flex items-center justify-center rounded-full text-accent hover:bg-accent/10"
            aria-label={t.addItemToSection}
          >
            <PlusIcon />
          </button>
        )}

        {/* 3-dots menu button */}
        {!reorderMode && (
          <button
            onClick={() => setShowSheet(true)}
            className="w-11 h-11 flex items-center justify-center rounded-full text-muted hover:bg-fill"
            aria-label={t.sectionOptions}
          >
            <EllipsisIcon />
          </button>
        )}
      </div>

      {/* Section items with dnd-kit */}
      {!section.collapsed && sectionItems.length > 0 && (
        <div className="mt-1 bg-surface rounded-group overflow-hidden">
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
                reorderMode={reorderMode}
                onToggleSelected={(selected) => onToggleSelected(item.id, selected)}
                onEdit={() => onEditItem(item)}
                onDelete={() => onDeleteItem(item.id)}
                onDuplicate={() => onDuplicateItem(item.id)}
              />
            ))}
          </SortableContainer>
        </div>
      )}

      <BottomSheet
        isOpen={showSheet}
        title={section.name}
        actions={sectionActions}
        onClose={() => setShowSheet(false)}
      />

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
