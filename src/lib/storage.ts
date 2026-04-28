import type { AppState } from '../types'

const STORAGE_KEY = 'app'

export const loadState = (): AppState => {
  try {
    const item = localStorage.getItem(STORAGE_KEY)
    if (!item) return { lists: [] }
    const state: AppState = JSON.parse(item)
    // Migrate: ensure every list has a sections array
    state.lists = state.lists.map(l => ({ sections: [], ...l }))
    return state
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
