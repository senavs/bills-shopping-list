import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { List, Item, Section } from '../types'
import { loadState, saveState } from '../lib/storage'

interface ListsContextType {
  lists: List[]
  createList: (list: Omit<List, 'id' | 'items' | 'sections' | 'archived'>) => void
  updateList: (id: string, updates: Partial<List>) => void
  deleteList: (id: string) => void
  archiveList: (id: string) => void
  unarchiveList: (id: string) => void
  duplicateList: (id: string) => void
  saveAsTemplate: (id: string) => void
  createFromTemplate: (templateId: string) => void
  deleteTemplate: (id: string) => void
  addPerson: (listId: string, name: string) => void
  removePerson: (listId: string, personId: string) => void
  addItem: (listId: string, item: Omit<Item, 'id'>) => string
  duplicateItem: (listId: string, itemId: string) => void
  updateItem: (listId: string, itemId: string, updates: Partial<Item>) => void
  deleteItem: (listId: string, itemId: string) => void
  reorderItem: (listId: string, fromIndex: number, toIndex: number) => void
  addSection: (listId: string, name: string) => void
  updateSection: (listId: string, sectionId: string, updates: Partial<Section>) => void
  deleteSection: (listId: string, sectionId: string) => void
  reorderSection: (listId: string, fromIndex: number, toIndex: number) => void
  reorderItemInSection: (listId: string, sectionId: string, fromIndex: number, toIndex: number) => void
}

const ListsContext = createContext<ListsContextType | undefined>(undefined)

export const ListsProvider = ({ children }: { children: ReactNode }) => {
  const [lists, setLists] = useState<List[]>(() => loadState().lists)

  useEffect(() => {
    saveState({ lists })
  }, [lists])

  const updateListById = (id: string, updater: (list: List) => List) =>
    setLists(prev => prev.map(l => l.id === id ? updater(l) : l))

  const createList = (list: Omit<List, 'id' | 'items' | 'sections' | 'archived'>) => {
    setLists(prev => [...prev, { ...list, id: crypto.randomUUID(), items: [], sections: [], archived: false }])
  }

  const updateList = (id: string, updates: Partial<List>) => {
    updateListById(id, l => ({ ...l, ...updates }))
  }

  const deleteList = (id: string) => {
    setLists(prev => prev.filter(l => l.id !== id))
  }

  const archiveList = (id: string) => updateList(id, { archived: true })
  const unarchiveList = (id: string) => updateList(id, { archived: false })

  const duplicateList = (id: string) => {
    const list = lists.find(l => l.id === id)
    if (list) {
      const itemIdMap: Record<string, string> = {}
      const items = list.items.map(item => {
        const newId = crypto.randomUUID()
        itemIdMap[item.id] = newId
        return { ...item, id: newId }
      })
      const sections = list.sections.map(s => ({
        ...s,
        id: crypto.randomUUID(),
        itemIds: s.itemIds.map(iid => itemIdMap[iid] ?? iid),
      }))
      setLists(prev => [...prev, { ...list, id: crypto.randomUUID(), name: `${list.name} (copy)`, items, sections }])
    }
  }

  const saveAsTemplate = (id: string) => {
    const list = lists.find(l => l.id === id)
    if (list) {
      const itemIdMap: Record<string, string> = {}
      const items = list.items.map(item => {
        const newId = crypto.randomUUID()
        itemIdMap[item.id] = newId
        return { ...item, id: newId, selected: false }
      })
      const sections = list.sections.map(s => ({
        ...s,
        id: crypto.randomUUID(),
        itemIds: s.itemIds.map(iid => itemIdMap[iid] ?? iid),
        collapsed: false,
      }))
      setLists(prev => [...prev, {
        ...list,
        id: crypto.randomUUID(),
        name: `${list.name}`,
        items,
        sections,
        archived: false,
        isTemplate: true,
      }])
    }
  }

  const createFromTemplate = (templateId: string) => {
    const template = lists.find(l => l.id === templateId && l.isTemplate)
    if (template) {
      const itemIdMap: Record<string, string> = {}
      const items = template.items.map(item => {
        const newId = crypto.randomUUID()
        itemIdMap[item.id] = newId
        return { ...item, id: newId, selected: false }
      })
      const sections = template.sections.map(s => ({
        ...s,
        id: crypto.randomUUID(),
        itemIds: s.itemIds.map(iid => itemIdMap[iid] ?? iid),
        collapsed: false,
      }))
      setLists(prev => [...prev, {
        ...template,
        id: crypto.randomUUID(),
        name: template.name,
        items,
        sections,
        archived: false,
        isTemplate: false,
      }])
    }
  }

  const deleteTemplate = (id: string) => {
    setLists(prev => prev.filter(l => l.id !== id))
  }

  const addPerson = (listId: string, name: string) => {
    updateListById(listId, l => ({
      ...l,
      people: [...(l.people || []), { id: crypto.randomUUID(), name }],
    }))
  }

  const removePerson = (listId: string, personId: string) => {
    updateListById(listId, l => ({
      ...l,
      people: (l.people || []).filter(p => p.id !== personId),
      items: l.items.map(item => ({
        ...item,
        assignedTo: (item.assignedTo || []).filter(id => id !== personId),
      })),
    }))
  }

  const addItem = (listId: string, item: Omit<Item, 'id'>): string => {
    const id = crypto.randomUUID()
    updateListById(listId, l => ({ ...l, items: [...l.items, { ...item, id }] }))
    return id
  }

  const duplicateItem = (listId: string, itemId: string) => {
    updateListById(listId, l => {
      const itemIndex = l.items.findIndex(i => i.id === itemId)
      if (itemIndex === -1) return l
      const original = l.items[itemIndex]
      const newId = crypto.randomUUID()
      const duplicate = { ...original, id: newId, selected: false }
      const items = [...l.items]
      items.splice(itemIndex + 1, 0, duplicate)
      // If the item is in a section, insert the duplicate right after it in that section too
      const sections = l.sections.map(s => {
        const idx = s.itemIds.indexOf(itemId)
        if (idx === -1) return s
        const itemIds = [...s.itemIds]
        itemIds.splice(idx + 1, 0, newId)
        return { ...s, itemIds }
      })
      return { ...l, items, sections }
    })
  }

  const updateItem = (listId: string, itemId: string, updates: Partial<Item>) => {
    updateListById(listId, l => ({ ...l, items: l.items.map(i => i.id === itemId ? { ...i, ...updates } : i) }))
  }

  const deleteItem = (listId: string, itemId: string) => {
    updateListById(listId, l => ({
      ...l,
      items: l.items.filter(i => i.id !== itemId),
      sections: l.sections.map(s => ({ ...s, itemIds: s.itemIds.filter(id => id !== itemId) })),
    }))
  }

  const reorderItem = (listId: string, fromIndex: number, toIndex: number) => {
    updateListById(listId, l => {
      const items = [...l.items]
      const [moved] = items.splice(fromIndex, 1)
      items.splice(toIndex, 0, moved)
      return { ...l, items }
    })
  }

  const addSection = (listId: string, name: string) => {
    updateListById(listId, l => ({
      ...l,
      sections: [...l.sections, { id: crypto.randomUUID(), name, itemIds: [], collapsed: false }],
    }))
  }

  const updateSection = (listId: string, sectionId: string, updates: Partial<Section>) => {
    updateListById(listId, l => ({
      ...l,
      sections: l.sections.map(s => s.id === sectionId ? { ...s, ...updates } : s),
    }))
  }

  const deleteSection = (listId: string, sectionId: string) => {
    updateListById(listId, l => ({
      ...l,
      sections: l.sections.filter(s => s.id !== sectionId),
    }))
  }

  const reorderSection = (listId: string, fromIndex: number, toIndex: number) => {
    updateListById(listId, l => {
      const sections = [...l.sections]
      const [moved] = sections.splice(fromIndex, 1)
      sections.splice(toIndex, 0, moved)
      return { ...l, sections }
    })
  }

  const reorderItemInSection = (listId: string, sectionId: string, fromIndex: number, toIndex: number) => {
    updateListById(listId, l => ({
      ...l,
      sections: l.sections.map(s => {
        if (s.id !== sectionId) return s
        const itemIds = [...s.itemIds]
        const [moved] = itemIds.splice(fromIndex, 1)
        itemIds.splice(toIndex, 0, moved)
        return { ...s, itemIds }
      }),
    }))
  }

  return (
    <ListsContext.Provider value={{
      lists, createList, updateList, deleteList, archiveList, unarchiveList, duplicateList,
      saveAsTemplate, createFromTemplate, deleteTemplate,
      addPerson, removePerson,
      addItem, duplicateItem, updateItem, deleteItem, reorderItem,
      addSection, updateSection, deleteSection, reorderSection, reorderItemInSection,
    }}>
      {children}
    </ListsContext.Provider>
  )
}

export const useLists = () => {
  const context = useContext(ListsContext)
  if (!context) throw new Error('useLists must be used within ListsProvider')
  return context
}
