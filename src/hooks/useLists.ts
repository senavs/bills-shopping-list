import { useState, useEffect } from 'react'
import type { List } from '../types'
import { loadState, saveState } from '../lib/storage'

export const useLists = () => {
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

  return { lists, createList, updateList, deleteList, archiveList, duplicateList }
}
