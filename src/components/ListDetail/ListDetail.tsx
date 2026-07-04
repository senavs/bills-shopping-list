import { useState, useCallback } from 'react'
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
import { SortableContainer } from '../shared/SortableContainer'
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
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)

  const list = lists.find(l => l.id === id)

  const handleDeleteItem = useCallback((itemId: string) => {
    if (!list) return

    const itemIndex = list.items.findIndex(i => i.id === itemId)
    const item = list.items[itemIndex]
    if (!item) return

    const sectionId = list.sections.find(s => s.itemIds.includes(itemId))?.id ?? null

    deleteItem(list.id, itemId)
    setPendingDelete({ listId: list.id, item, index: itemIndex, sectionId })
  }, [list, deleteItem])

  const handleUndo = useCallback(() => {
    if (!pendingDelete) return

    const { listId, item, index, sectionId } = pendingDelete

    const newId = addItem(listId, {
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      selected: item.selected,
      includeInTax: item.includeInTax,
    })

    const currentList = lists.find(l => l.id === listId)
    if (currentList) {
      const currentIndex = currentList.items.length
      if (index < currentIndex) {
        reorderItem(listId, currentIndex, index)
      }
    }

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
        updateSection(list.id, currentSectionId, { itemIds: oldSection.itemIds.filter(id2 => id2 !== editingItem.id) })
      }
      if (sectionId) {
        const newSection = list.sections.find(s => s.id === sectionId)!
        updateSection(list.id, sectionId, { itemIds: [...newSection.itemIds, editingItem.id] })
      }
    }
    setEditingItem(null)
  }

  // Reorder unassigned items using @dnd-kit
  const handleUnassignedReorder = (fromIndex: number, toIndex: number) => {
    const fromGlobal = list.items.indexOf(unassignedItems[fromIndex])
    const toGlobal = list.items.indexOf(unassignedItems[toIndex])
    reorderItem(list.id, fromGlobal, toGlobal)
  }

  // Reorder sections using @dnd-kit
  const handleSectionReorder = (fromIndex: number, toIndex: number) => {
    reorderSection(list.id, fromIndex, toIndex)
  }

  const isEmpty = list.items.length === 0 && list.sections.length === 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-28">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link to="/app" className="w-9 h-9 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors mb-1" aria-label={t.back}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
              </svg>
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{list.name}</h1>
              {isTemplate && (
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                  Template
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {list.type === 'shopping' ? '🛒' : '🍽️'} {list.type === 'shopping' ? t.shopping : t.restaurant} • {list.currency}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {(list.people || []).length > 0 && !isTemplate && (
              <button
                onClick={() => setShowSplitModal(true)}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
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
              className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Edit list"
              aria-label="Edit list"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
              </svg>
            </Link>
          </div>
        </div>

        {/* People manager */}
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
            {/* Sections with dnd-kit */}
            <SortableContainer
              items={list.sections.map(s => s.id)}
              onReorder={handleSectionReorder}
            >
              {list.sections.map((section) => (
                <SectionBlock
                  key={section.id}
                  section={section}
                  list={list}
                  hideCheckbox={isTemplate}
                  people={list.people || []}
                  onUpdateSection={(sectionId, updates) => updateSection(list.id, sectionId, updates)}
                  onDeleteSection={(sectionId) => deleteSection(list.id, sectionId)}
                  onReorderItemInSection={(sectionId, from, to) => reorderItemInSection(list.id, sectionId, from, to)}
                  onEditItem={setEditingItem}
                  onDeleteItem={handleDeleteItem}
                  onToggleSelected={(itemId, selected) => updateItem(list.id, itemId, { selected })}
                />
              ))}
            </SortableContainer>

            {/* Unassigned items */}
            {unassignedItems.length > 0 && list.sections.length > 0 && (
              <div className="pt-2 pb-1 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {t.otherItems}
              </div>
            )}
            <SortableContainer
              items={unassignedItems.map(i => i.id)}
              onReorder={handleUnassignedReorder}
            >
              {unassignedItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  currency={list.currency}
                  hideCheckbox={isTemplate}
                  people={list.people || []}
                  onToggleSelected={(selected) => updateItem(list.id, item.id, { selected })}
                  onEdit={() => setEditingItem(item)}
                  onDelete={() => handleDeleteItem(item.id)}
                />
              ))}
            </SortableContainer>
          </div>
        )}

        {/* FABs - positioned above TotalsBar */}
        <div className="fixed bottom-2 right-4 flex flex-col items-center gap-2 z-10">
          <button
            onClick={() => setShowSectionForm(true)}
            className="w-11 h-11 bg-gray-600 text-white rounded-full shadow-lg hover:bg-gray-700 active:shadow-md flex items-center justify-center text-lg transition-all"
            aria-label={t.newSection}
            title={t.newSection}
          >
            ☰
          </button>
          <button
            onClick={() => setShowItemForm(true)}
            className="bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:shadow-md flex items-center justify-center text-2xl transition-all"
            style={{ width: '52px', height: '52px' }}
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
