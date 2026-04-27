import type { AppState } from '../types'

const STORAGE_KEY = 'app'

export const loadState = (): AppState => {
  try {
    const item = localStorage.getItem(STORAGE_KEY)
    return item ? JSON.parse(item) : { lists: [] }
  } catch {
    return { lists: [] }
  }
}

export const saveState = (state: AppState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota exceeded or other error - silently fail
  }
}
