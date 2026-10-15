import type { AppState, List } from '../types'

export const exportData = async (state: AppState): Promise<void> => {
  const dataStr = JSON.stringify(state, null, 2)
  const fileName = `bills-shopping-${new Date().toISOString().split('T')[0]}.json`

  // iOS standalone PWAs can't follow <a download>; the share sheet offers
  // "Save to Files", AirDrop, messaging apps, etc.
  if (typeof File !== 'undefined' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
    const file = new File([dataStr], fileName, { type: 'application/json' })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: fileName })
      } catch (error) {
        // The user closing the share sheet is not an error
        if (!(error instanceof Error && error.name === 'AbortError')) throw error
      }
      return
    }
  }

  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const validateImportData = (data: unknown): data is AppState => {
  if (!data || typeof data !== 'object') return false
  
  const state = data as Record<string, unknown>
  if (!Array.isArray(state.lists)) return false
  
  return state.lists.every((list: unknown) => {
    if (!list || typeof list !== 'object') return false
    const l = list as Record<string, unknown>
    
    const isValidList = (
      typeof l.id === 'string' &&
      typeof l.name === 'string' &&
      (l.type === 'shopping' || l.type === 'restaurant' || l.type === 'bar') &&
      (l.currency === 'BRL' || l.currency === 'USD') &&
      typeof l.taxPercentage === 'number' &&
      Array.isArray(l.items) &&
      typeof l.archived === 'boolean' &&
      (l.updatedAt === undefined || typeof l.updatedAt === 'number')
    )
    
    if (!isValidList) return false
    
    // Validate items
    const items = l.items as unknown[]
    const itemsValid = items.every((item: unknown) => {
      if (!item || typeof item !== 'object') return false
      const i = item as Record<string, unknown>
      return (
        typeof i.id === 'string' &&
        typeof i.name === 'string' &&
        typeof i.quantity === 'number' &&
        typeof i.unitPrice === 'number' &&
        typeof i.selected === 'boolean' &&
        typeof i.includeInTax === 'boolean'
      )
    })
    if (!itemsValid) return false

    // Validate sections (optional field - missing means no sections)
    if (l.sections !== undefined) {
      if (!Array.isArray(l.sections)) return false
      return (l.sections as unknown[]).every((sec: unknown) => {
        if (!sec || typeof sec !== 'object') return false
        const s = sec as Record<string, unknown>
        return (
          typeof s.id === 'string' &&
          typeof s.name === 'string' &&
          Array.isArray(s.itemIds) &&
          typeof s.collapsed === 'boolean'
        )
      })
    }
    return true
  })
}

/**
 * Normalize imported state: ensure every item has a unitType field and stamp
 * updatedAt so an intentional import wins over older cloud copies.
 */
export const normalizeImportedState = (state: AppState, now: number = Date.now()): AppState => ({
  ...state,
  lists: state.lists.map((l: List) => ({
    ...l,
    updatedAt: now,
    items: l.items.map(item => ({
      ...item,
      unitType: item.unitType ?? 'unit',
    })),
  })),
})

export const importData = (file: File): Promise<AppState> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (validateImportData(data)) {
          resolve(normalizeImportedState(data))
        } else {
          reject(new Error('Invalid data format'))
        }
      } catch (error) {
        reject(new Error('Failed to parse JSON file'))
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
