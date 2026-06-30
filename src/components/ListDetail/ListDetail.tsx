import { useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useLists } from '../../hooks/useLists'
import { ItemForm } from '../ItemForm/ItemForm'
import { TotalsBar } from '../TotalsBar/TotalsBar'
import { SectionBlock } from '../SectionBlock/SectionBlock'
import { SectionForm } from '../SectionForm/SectionForm'
import { ItemRow } from '../shared/ItemRow'
import { UndoToast } from '../shared/UndoToast'
import { PeopleManager } from '../PeopleManager/PeopleManager'
import { SplitModal } from '../SplitModal/SplitModal'
import { useLanguage } from '../../contexts/LanguageContext'
import type { Item } from '../../types'

interface PendingDelete {
  listId: string
  item: Item
  index: number
  sectionId: string | null
}

export const ListDetail = () => {
  const { id } = useParams<{ id: string }>()
  const {
    lists, addItem, updateItem, deleteItem, reorderItem,
    addSection, updateSection, deleteSection, reorderSection, reorderItemInSection,
    addPerson, removePerson,
  } = useLists()
  const { t } = useLanguage()
  const [showItemForm, setShowItemForm] = useState(false)
  const [showSectionForm, setShowSectionForm] = useState(false)
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [sectionDragOver, setSectionDragOver] = useState<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const dragIndexRef = useRef<number | null>(null)
  const sectionDragRef = useRef<number | null>(null)

  const list = lists.find(l => l.id === id)

  const handleDeleteItem = useCallback((itemId: string) => {
    if (!list) return

    // Store item info for potential undo
    const itemIndex = list.items.findIndex(i => i.id === itemId)
    const item = list.items[itemIndex]
    if (!item) return

    const sectionId = list.sections.find(s => s.itemIds.includes(itemId))?.id ?? null

    // Delete immediately for responsive UI
    deleteItem(list.id, itemId)

    // Store pending delete for undo
    setPendingDelete({ listId: list.id, item, index: itemIndex, sectionId })
  }, [list, deleteItem])

  const handleUndo = useCallback(() => {
    if (!pendingDelete) return

    const { listId, item, index, sectionId } = pendingDelete

    // Re-add the item (addItem generates a new ID, so we need to use updateList directly)
    // Instead, we add the item back and then fix the section
    const newId = addItem(listId, {
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      selected: item.selected,
      includeInTax: item.includeInTax,
    })

    // Move item to its original position
    const currentList = lists.find(l => l.id === listId)
    if (currentList) {
      const currentIndex = currentList.items.length // it was just appended at the end
      if (index < currentIndex) {
        reorderItem(listId, currentIndex, index)
      }
    }

    // Restore section membership
    if (sectionId) {
      const currentList2 = lists.find(l => l.id === listId)
      const section = currentList2?.sections.find(s => s.id === sectionId)
      if (section) {
        updateSection(listId, sectionId, { itemIds: [...section.itemIds, newId] })
      }
    }

    setPendingDelete(null)
  }, [pendingDelete, lists, addItem, reorderItem, updateSection])

  const handleDismissToast = useCallback(() => {
    setPendingDelete(null)
  }, [])

  if (!list) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">{t.listNotFound}</p>
          <Link to="/app" className="text-blue-600 dark:text-blue-400 hover:underline">{t.backToDashboard}</Link>
        </div>
      </div>
    )
  }

  const assignedItemIds = new Set(list.sections.flatMap(s => s.itemIds))
  const unassignedItems = list.items.filter(i => !assignedItemIds.has(i.id))
  const isTemplate = !!list.isTemplate

  const handleAddItem = (item: Omit<Item, 'id'>, sectionId: string) => {
    const newId = addItem(list.id, item)
    if (sectionId) {
      const section = list.sections.find(s => s.id === sectionId)
      if (section) updateSection(list.id, sectionId, { itemIds: [...section.itemIds, newId] })
    }
    setShowItemForm(false)
  }

  const handleEditItem = (item: Omit<Item, 'id'>, sectionId: string) => {
    if (!editingItem) return
    updateItem(list.id, editingItem.id, item)
    const currentSectionId = list.sections.find(s => s.itemIds.includes(editingItem.id))?.id ?? ''
    if (sectionId !== currentSectionId) {
      if (currentSectionId) {
        const oldSection = list.sections.find(s => s.id === currentSectionId)!
        updateSection(list.id, currentSectionId, { itemIds: oldSection.itemIds.filter(id => id !== editingItem.id) })
      }
      if (sectionId) {
        const newSection = list.sections.find(s => s.id === sectionId)!
        updateSection(list.id, sectionId, { itemIds: [...newSection.itemIds, editingItem.id] })
      }
    }
    setEditingItem(null)
  }

  // Unassigned item drag handlers
  const handleDragStart = (index: number) => { dragIndexRef.current = index }
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index) }
  const handleDrop = (toIndex: number) => {
    if (dragIndexRef.current !== null && dragIndexRef.current !== toIndex) {
      // Map unassigned index back to global items index
      const fromGlobal = list.items.indexOf(unassignedItems[dragIndexRef.current])
      const toGlobal = list.items.indexOf(unassignedItems[toIndex])
      reorderItem(list.id, fromGlobal, toGlobal)
    }
    dragIndexRef.current = null
    setDragOverIndex(null)
  }
  const handleDragEnd = () => { dragIndexRef.current = null; setDragOverIndex(null) }

  // Section drag handlers
  const handleSectionDragStart = (index: number) => { sectionDragRef.current = index }
  const handleSectionDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setSectionDragOver(index) }
  const handleSectionDrop = (toIndex: number) => {
    if (sectionDragRef.current !== null && sectionDragRef.current !== toIndex) {
      reorderSection(list.id, sectionDragRef.current, toIndex)
    }
    sectionDragRef.current = null
    setSectionDragOver(null)
  }
  const handleSectionDragEnd = () => { sectionDragRef.current = null; setSectionDragOver(null) }

  const isEmpty = list.items.length === 0 && list.sections.length === 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link to="/app" className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-2 block">{t.back}</Link>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{list.name}</h1>
              {isTemplate && (
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                  Template
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {list.type === 'shopping' ? '🛒' : '🍽️'} {list.type} • {list.currency}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(list.people || []).length > 0 && !isTemplate && (
              <button
                onClick={() => setShowSplitModal(true)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800"
                title="View Split"
                aria-label="View bill split"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
                </svg>
              </button>
            )}
            <Link
              to={`/lists/${list.id}/edit`}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Edit list"
              aria-label="Edit list"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
              </svg>
            </Link>
          </div>
        </div>

        {/* People manager - always visible for non-templates */}
        {!isTemplate && (
          <PeopleManager
            people={list.people || []}
            onAddPerson={(name) => addPerson(list.id, name)}
            onRemovePerson={(personId) => removePerson(list.id, personId)}
          />
        )}

        {isEmpty ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {t.noItemsYet}
          </div>
        ) : (
          <div className="space-y-2 mb-32">
            {/* Sections */}
            {list.sections.map((section, sectionIndex) => (
              <SectionBlock
                key={section.id}
                section={section}
                sectionIndex={sectionIndex}
                totalSections={list.sections.length}
                list={list}
                hideCheckbox={isTemplate}
                people={list.people || []}
                onUpdateSection={(sectionId, updates) => updateSection(list.id, sectionId, updates)}
                onDeleteSection={(sectionId) => deleteSection(list.id, sectionId)}
                onReorderSection={(from, to) => reorderSection(list.id, from, to)}
                onReorderItemInSection={(sectionId, from, to) => reorderItemInSection(list.id, sectionId, from, to)}
                onEditItem={setEditingItem}
                onDeleteItem={handleDeleteItem}
                onToggleSelected={(itemId, selected) => updateItem(list.id, itemId, { selected })}
                onSectionDragStart={handleSectionDragStart}
                onSectionDragOver={handleSectionDragOver}
                onSectionDrop={handleSectionDrop}
                onSectionDragEnd={handleSectionDragEnd}
                isDragOver={sectionDragOver === sectionIndex}
              />
            ))}

            {/* Unassigned items */}
            {unassignedItems.length > 0 && list.sections.length > 0 && (
              <div className="pt-2 pb-1 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Other items
              </div>
            )}
            {unassignedItems.map((item, index) => (
              <ItemRow
                key={item.id}
                item={item}
                index={index}
                totalItems={unassignedItems.length}
                currency={list.currency}
                isDragOver={dragOverIndex === index}
                hideCheckbox={isTemplate}
                people={list.people || []}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                onMoveUp={() => {
                  const globalFrom = list.items.indexOf(item)
                  const prevUnassigned = unassignedItems[index - 1]
                  const globalTo = list.items.indexOf(prevUnassigned)
                  reorderItem(list.id, globalFrom, globalTo)
                }}
                onMoveDown={() => {
                  const globalFrom = list.items.indexOf(item)
                  const nextUnassigned = unassignedItems[index + 1]
                  const globalTo = list.items.indexOf(nextUnassigned)
                  reorderItem(list.id, globalFrom, globalTo)
                }}
                onToggleSelected={(selected) => updateItem(list.id, item.id, { selected })}
                onEdit={() => setEditingItem(item)}
                onDelete={() => handleDeleteItem(item.id)}
              />
            ))}
          </div>
        )}

        {/* FABs — stacked above TotalsBar */}
        <div className="fixed bottom-6 right-4 flex flex-col gap-2 z-10">
          <button
            onClick={() => setShowSectionForm(true)}
            className="w-11 h-11 bg-gray-600 text-white rounded-full shadow-lg hover:bg-gray-700 flex items-center justify-center text-lg"
            aria-label={t.newSection}
            title={t.newSection}
          >
            ☰
          </button>
          <button
            onClick={() => setShowItemForm(true)}
            className="w-11 h-11 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center text-xl"
            aria-label={t.addItem}
          >
            +
          </button>
        </div>
      </div>

      <TotalsBar list={list} />

      {pendingDelete && (
        <UndoToast
          message={`"${pendingDelete.item.name}" deleted`}
          onUndo={handleUndo}
          onDismiss={handleDismissToast}
        />
      )}

      {showItemForm && <ItemForm sections={list.sections} people={list.people || []} onSubmit={handleAddItem} onCancel={() => setShowItemForm(false)} />}
      {editingItem && (
        <ItemForm
          item={editingItem}
          sections={list.sections}
          people={list.people || []}
          initialSectionId={list.sections.find(s => s.itemIds.includes(editingItem.id))?.id ?? ''}
          onSubmit={handleEditItem}
          onCancel={() => setEditingItem(null)}
        />
      )}
      {showSectionForm && (
        <SectionForm
          onSubmit={(name) => { addSection(list.id, name); setShowSectionForm(false) }}
          onCancel={() => setShowSectionForm(false)}
        />
      )}

      {showSplitModal && (
        <SplitModal list={list} onClose={() => setShowSplitModal(false)} />
      )}
    </div>
  )
}
