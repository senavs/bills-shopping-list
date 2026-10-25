import { useState, useCallback } from 'react'
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom'
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
import { useSync } from '../../contexts/SyncContext'
import { useSharedSync } from '../../contexts/SharedSyncContext'
import { buildInviteUrl, shareInvite } from '../../lib/sharedSync/invite'
import type { Item } from '../../types'
import { ChevronLeftIcon, PencilIcon, PlusIcon, ShareIcon, UsersIcon } from '../shared/icons'

interface PendingDelete {
  listId: string
  item: Item
  index: number
  sectionId: string | null
}

export const ListDetail = () => {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const locationState = location.state as { activeTab?: 'active' | 'archived' | 'templates'; from?: string } | null
  const {
    lists, addItem, updateItem, deleteItem, reorderItem,
    addSection, updateSection, deleteSection, reorderSection, reorderItemInSection,
    addPerson, removePerson, duplicateItem,
  } = useLists()
  const { t } = useLanguage()
  const [showItemForm, setShowItemForm] = useState(false)
  const [defaultSectionId, setDefaultSectionId] = useState('')
  const [showSectionForm, setShowSectionForm] = useState(false)
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [reorderMode, setReorderMode] = useState(false)
  const [inviteNotice, setInviteNotice] = useState<string | null>(null)
  const sync = useSync()
  const sharedSync = useSharedSync()

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
      unitType: item.unitType,
      selected: item.selected,
      includeInTax: item.includeInTax,
      assignedTo: item.assignedTo,
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
      <div className="min-h-dvh bg-bg flex items-center justify-center pt-safe">
        <div className="text-center">
          <p className="text-muted mb-4">{t.listNotFound}</p>
          <button onClick={() => navigate('/app', { state: { activeTab: locationState?.activeTab } })} className="min-h-[44px] px-3 text-accent">{t.backToDashboard}</button>
        </div>
      </div>
    )
  }

  const assignedItemIds = new Set(list.sections.flatMap(s => s.itemIds))
  const unassignedItems = list.items.filter(i => !assignedItemIds.has(i.id))
  const isTemplate = !!list.isTemplate
  const shared = list.shared
  const inviteDisabled = !sync.uid || sharedSync.isPendingCreate(list.id)

  const handleInvite = async () => {
    if (!shared) return
    const url = buildInviteUrl(`${window.location.origin}${window.location.pathname}`, list.id, shared.inviteToken)
    const result = await shareInvite(url, t.inviteShareText.replace('{name}', list.name))
    if (result === 'copied') {
      setInviteNotice(t.inviteLinkCopied)
      setTimeout(() => setInviteNotice(null), 3000)
    }
  }

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

  const typeEmoji = { shopping: '🛒', restaurant: '🍽️', bar: '🍻' }[list.type] || '🛒'
  const typeLabel = { shopping: t.shopping, restaurant: t.restaurant, bar: t.bar }[list.type]

  const renderItemRow = (item: Item) => (
    <ItemRow
      key={item.id}
      item={item}
      currency={list.currency}
      hideCheckbox={isTemplate}
      people={list.people || []}
      reorderMode={reorderMode}
      onToggleSelected={(selected) => updateItem(list.id, item.id, { selected })}
      onEdit={() => setEditingItem(item)}
      onDelete={() => handleDeleteItem(item.id)}
      onDuplicate={() => duplicateItem(list.id, item.id)}
    />
  )

  return (
    <div
      className="min-h-dvh bg-bg"
      style={{ paddingBottom: 'calc(var(--totals-bar-h, 0px) + 1.5rem)' }}
    >
      {/* Navigation bar: back + actions, translucent like iOS */}
      <div className="sticky top-0 z-30 bg-bg/85 backdrop-blur-md pt-safe">
        <div className="container mx-auto max-w-4xl px-2 h-11 flex items-center justify-between">
          <button
            onClick={() => navigate('/app', { state: { activeTab: locationState?.activeTab } })}
            className="flex items-center gap-0.5 min-h-[44px] pr-2 text-accent text-body"
            aria-label={t.back}
          >
            <ChevronLeftIcon className="w-6 h-6" />
            <span>{t.lists}</span>
          </button>
          <div className="flex items-center gap-1">
            {!isEmpty && (
              <button
                type="button"
                onClick={() => setReorderMode(m => !m)}
                aria-pressed={reorderMode}
                className={`px-3 min-h-[44px] text-body text-accent ${reorderMode ? 'font-semibold' : ''}`}
              >
                {reorderMode ? t.done : t.reorder}
              </button>
            )}
            {shared && (
              <button
                onClick={() => { void handleInvite() }}
                disabled={inviteDisabled}
                className="w-11 h-11 flex items-center justify-center rounded-full text-accent hover:bg-accent/10 disabled:opacity-50"
                title={t.invite}
                aria-label={t.invite}
              >
                <ShareIcon className="w-6 h-6" />
              </button>
            )}
            {(list.people || []).length > 0 && !isTemplate && (
              <button
                onClick={() => setShowSplitModal(true)}
                className="w-11 h-11 flex items-center justify-center rounded-full text-accent hover:bg-accent/10"
                title={t.viewSplit}
                aria-label={t.viewSplit}
              >
                <UsersIcon className="w-6 h-6" />
              </button>
            )}
            <Link
              to={`/lists/${list.id}/edit`}
              state={{ activeTab: locationState?.activeTab, from: `/lists/${list.id}` }}
              className="w-11 h-11 flex items-center justify-center rounded-full text-accent hover:bg-accent/10"
              title={t.editList}
              aria-label={t.editList}
            >
              <PencilIcon className="w-6 h-6" />
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl">
        {/* Large title */}
        <div className="pt-1 pb-3">
          <h1 className="text-large-title font-bold text-ink break-words">{list.name}</h1>
          <p className="text-callout text-muted flex items-center gap-2">
            <span>{typeEmoji} {typeLabel}</span>
            {isTemplate && (
              <span className="text-footnote font-semibold bg-accent/15 text-accent px-2 py-0.5 rounded-full">
                {t.templateBadge}
              </span>
            )}
          </p>
          {shared && !sync.uid && (
            <p className="mt-2 text-footnote text-muted">{t.sharedSignInToSync}</p>
          )}
          {inviteNotice && (
            <p role="status" className="mt-2 text-footnote text-accent">{inviteNotice}</p>
          )}
        </div>

        {/* People manager */}
        {!isTemplate && (
          <PeopleManager
            people={list.people || []}
            onAddPerson={(name) => addPerson(list.id, name)}
            onRemovePerson={(personId) => removePerson(list.id, personId)}
            shared={shared && {
              myPersonId: sync.uid ? shared.memberPeople?.[sync.uid] : undefined,
              memberPersonIds: Object.values(shared.memberPeople ?? {}),
              onInvite: () => { void handleInvite() },
              inviteDisabled,
            }}
          />
        )}

        {isEmpty ? (
          <div className="text-center py-12 text-muted">
            {t.noItemsYet}
          </div>
        ) : (
          <div>
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
                  reorderMode={reorderMode}
                  onUpdateSection={(sectionId, updates) => updateSection(list.id, sectionId, updates)}
                  onDeleteSection={(sectionId) => deleteSection(list.id, sectionId)}
                  onReorderItemInSection={(sectionId, from, to) => reorderItemInSection(list.id, sectionId, from, to)}
                  onEditItem={setEditingItem}
                  onDeleteItem={handleDeleteItem}
                  onDuplicateItem={(itemId) => duplicateItem(list.id, itemId)}
                  onToggleSelected={(itemId, selected) => updateItem(list.id, itemId, { selected })}
                  onAddItem={() => { setDefaultSectionId(section.id); setShowItemForm(true) }}
                />
              ))}
            </SortableContainer>

            {/* Unassigned items */}
            {unassignedItems.length > 0 && (
              <div className={list.sections.length > 0 ? 'pt-4' : ''}>
                {list.sections.length > 0 && (
                  <h2 className="pl-1 min-h-[44px] flex items-center text-callout font-semibold text-ink">
                    {t.otherItems}
                  </h2>
                )}
                <div className="bg-surface rounded-group overflow-hidden">
                  <SortableContainer
                    items={unassignedItems.map(i => i.id)}
                    onReorder={handleUnassignedReorder}
                  >
                    {unassignedItems.map(renderItemRow)}
                  </SortableContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {!reorderMode && (
          <button
            type="button"
            onClick={() => setShowSectionForm(true)}
            className="mt-4 px-1 min-h-[44px] flex items-center gap-1 text-accent text-body"
          >
            <PlusIcon className="w-5 h-5" />
            {t.newSection}
          </button>
        )}
      </div>

      <TotalsBar list={list} onAddItem={() => { setDefaultSectionId(''); setShowItemForm(true) }} />

      {pendingDelete && (
        <UndoToast
          message={t.itemDeleted.replace('{name}', pendingDelete.item.name)}
          onUndo={handleUndo}
          onDismiss={handleDismissToast}
        />
      )}

      {showItemForm && <ItemForm sections={list.sections} people={list.people || []} initialSectionId={defaultSectionId} onSubmit={handleAddItem} onCancel={() => setShowItemForm(false)} />}
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
