/** Case- and accent-insensitive form of a string, so "pao" finds "Pão". */
export const normalizeSearch = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()

/** Whether `text` contains `query`; a blank query matches everything. */
export const matchesSearch = (text: string, query: string): boolean =>
  normalizeSearch(text).includes(normalizeSearch(query))
