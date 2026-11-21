import { useState } from 'react'
import type { Item, List } from '../../types'
import { useLanguage } from '../../contexts/LanguageContext'
import { formatCurrency } from '../../lib/format'
import { matchesSearch } from '../../lib/search'
import { CheckIcon, SearchIcon } from '../shared/icons'

interface ItemSearchProps {
  list: List
  onSelect: (item: Item) => void
  onClose: () => void
}

/**
 * Full-screen item search. Results are a flat list in the list's visual order
 * (sections first, then "Other items"); tapping one hands the item back so the
 * caller can open its editor, instead of toggling it like a row in the list.
 */
export const ItemSearch = ({ list, onSelect, onClose }: ItemSearchProps) => {
  const { t, locale } = useLanguage()
  const [query, setQuery] = useState('')

  const byId = new Map(list.items.map(item => [item.id, item]))
  const inSection = new Set(list.sections.flatMap(s => s.itemIds))
  const entries: { item: Item; group: string }[] = [
    ...list.sections.flatMap(section =>
      section.itemIds
        .map(id => byId.get(id))
        .filter((item): item is Item => !!item)
        .map(item => ({ item, group: section.name })),
    ),
    ...list.items.filter(item => !inSection.has(item.id)).map(item => ({ item, group: t.otherItems })),
  ]
  const results = entries.filter(({ item }) => matchesSearch(item.name, query))
  const showCheck = !list.isTemplate

  return (
    <div role="dialog" aria-modal="true" aria-label={t.searchItems} className="fixed inset-0 z-50 bg-bg flex flex-col pt-safe">
      <div className="container mx-auto max-w-4xl px-4 pt-3 pb-2 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-[10px] bg-fill pl-3 pr-2">
          <SearchIcon className="w-5 h-5 shrink-0 text-muted" />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onClose() }}
            placeholder={t.searchItems}
            aria-label={t.searchItems}
            className="flex-1 min-w-0 min-h-[40px] bg-transparent text-body text-ink placeholder:text-muted outline-none"
          />
        </div>
        <button type="button" onClick={onClose} className="min-h-[44px] px-1 text-body text-accent">
          {t.cancel}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-safe">
        <div className="container mx-auto max-w-4xl px-4 pt-2 pb-6">
          {results.length === 0 ? (
            <p className="text-center py-12 text-muted">
              {t.noSearchResults.replace('{query}', query.trim())}
            </p>
          ) : (
            <ul className="bg-surface rounded-group overflow-hidden">
              {results.map(({ item, group }) => (
                <li
                  key={item.id}
                  className="relative after:absolute after:top-0 after:left-4 after:right-0 after:h-px after:bg-hairline first:after:hidden"
                >
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 min-h-[56px] text-left active:bg-fill"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className={`truncate text-body ${showCheck && item.selected ? 'text-muted' : 'text-ink'}`}>{item.name}</span>
                        {showCheck && item.selected && <CheckIcon className="w-4 h-4 shrink-0 text-accent" />}
                      </span>
                      <span className="block truncate text-footnote text-muted">{group}</span>
                    </span>
                    <span className="shrink-0 text-body num text-ink">
                      {formatCurrency(item.quantity * item.unitPrice, list.currency, locale)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
