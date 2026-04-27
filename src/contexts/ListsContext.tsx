import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { List, Item } from '../types'
import { loadState, saveState } from '../lib/storage'

interface ListsContextType {
  lists: List[]
  createList: (list: Omit<List, 'id' | 'items' | 'archived'>) => void
  updateList: (id: string, updates: Partial<List>) => void
  deleteList: (id: string) => void
  archiveList: (id: string) => void
  unarchiveList: (id: string) => void
  duplicateList: (id: string) => void
  addItem: (listId: string, item: Omit<Item, 'id'>) => void
  updateItem: (listId: string, itemId: string, updates: Partial<Item>) => void
  deleteItem: (listId: string, itemId: string) => void
  reorderItem: (listId: string, fromIndex: number, toIndex: number) => void
}

const ListsContext = createContext<ListsContextType | undefined>(undefined)

export const ListsProvider = ({ children }: { children: ReactNode }) => {
  const [lists, setLists] = useState<List[]>(() => loadState().lists)

  useEffect(() => {
    saveState({ lists })
  }, [lists])

  const createList = (list: Omit<List, 'id' | 'items' | 'archived'>) => {
    const newList: List = {
      ...list,
      id: crypto.randomUUID(),
      items: [],
      archived: false,
    }
    setLists(prev => [...prev, newList])
  }

  const updateList = (id: string, updates: Partial<List>) => {
    setLists(prev => prev.map(list => list.id === id ? { ...list, ...updates } : list))
  }

  const deleteList = (id: string) => {
    setLists(prev => prev.filter(list => list.id !== id))
  }

  const archiveList = (id: string) => {
    updateList(id, { archived: true })
  }

  const unarchiveList = (id: string) => {
    updateList(id, { archived: false })
  }

  const duplicateList = (id: string) => {
    const list = lists.find(l => l.id === id)
    if (list) {
      const newList: List = {
        ...list,
        id: crypto.randomUUID(),
        name: `${list.name} (copy)`,
        items: list.items.map(item => ({ ...item, id: crypto.randomUUID() })),
      }
      setLists(prev => [...prev, newList])
    }
  }

  const addItem = (listId: string, item: Omit<Item, 'id'>) => {
    const newItem: Item = { ...item, id: crypto.randomUUID() }
    setLists(prev => prev.map(list => 
      list.id === listId ? { ...list, items: [...list.items, newItem] } : list
    ))
  }

  const updateItem = (listId: string, itemId: string, updates: Partial<Item>) => {
    setLists(prev => prev.map(list =>
      list.id === listId
        ? { ...list, items: list.items.map(item => item.id === itemId ? { ...item, ...updates } : item) }
        : list
    ))
  }

  const deleteItem = (listId: string, itemId: string) => {
    setLists(prev => prev.map(list =>
      list.id === listId
        ? { ...list, items: list.items.filter(item => item.id !== itemId) }
        : list
    ))
  }

  const reorderItem = (listId: string, fromIndex: number, toIndex: number) => {
    setLists(prev => prev.map(list => {
      if (list.id !== listId) return list
      const items = [...list.items]
      const [moved] = items.splice(fromIndex, 1)
      items.splice(toIndex, 0, moved)
      return { ...list, items }
    }))
  }

  return (
    <ListsContext.Provider value={{ lists, createList, updateList, deleteList, archiveList, unarchiveList, duplicateList, addItem, updateItem, deleteItem, reorderItem }}>
      {children}
    </ListsContext.Provider>
  )
}

export const useLists = () => {
  const context = useContext(ListsContext)
  if (!context) {
    throw new Error('useLists must be used within ListsProvider')
  }
  return context
}
