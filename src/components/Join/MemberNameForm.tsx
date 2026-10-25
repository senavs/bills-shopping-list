import { useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { loadSharedName, saveSharedName } from '../../lib/sharedSync/sharedName'

/** "Your name in this list": a member names their own person once (prefilled with the last name used here). */
export const MemberNameForm = ({ onSubmit }: { onSubmit: (name: string) => void }) => {
  const { t } = useLanguage()
  const [name, setName] = useState(loadSharedName)
  const [error, setError] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError(true)
      return
    }
    saveSharedName(trimmed)
    onSubmit(trimmed)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="member-name" className="block text-sm font-medium text-ink mb-2">{t.yourNameInList} *</label>
      <input
        id="member-name"
        type="text"
        value={name}
        onChange={(e) => { setName(e.target.value); setError(false) }}
        autoCapitalize="words"
        autoComplete="off"
        enterKeyHint="done"
        className="w-full px-3 py-2 border border-hairline rounded bg-surface text-ink text-base mb-2"
      />
      {error && <p className="text-footnote text-danger mb-2">{t.yourNameRequired}</p>}
      <button type="submit" className="mt-2 px-5 min-h-[44px] bg-accent text-on-accent font-semibold active:opacity-80 rounded-xl">
        {t.joinContinue}
      </button>
    </form>
  )
}
