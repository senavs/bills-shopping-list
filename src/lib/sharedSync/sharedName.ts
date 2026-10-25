// Last name the user gave themselves in a shared list on this device (prefills the next one)
const STORAGE_KEY = 'shared-name'

export const loadSharedName = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export const saveSharedName = (name: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY, name)
  } catch {
    // ignore
  }
}
