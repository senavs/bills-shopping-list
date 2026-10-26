import { useEffect, useRef, useState } from 'react'
import type { Item, Person } from '../../types'
import { useLanguage } from '../../contexts/LanguageContext'
import { useScrollLock } from '../../hooks/useScrollLock'
import { assignedItemCounts, initials } from '../../lib/people'
import { ChevronRightIcon, CloseIcon, PhoneIcon, PlusIcon, ShareIcon, TrashIcon, UsersIcon } from '../shared/icons'

interface SharedPeople {
  myPersonId?: string
  memberPersonIds: string[]
  onInvite: () => void
  inviteDisabled: boolean
  /** Feedback after inviting (e.g. "link copied"), shown inside the modal */
  notice?: string | null
}

interface PeopleManagerProps {
  people: Person[]
  /** Used to show how many items each person has */
  items?: Item[]
  onAddPerson: (name: string) => void
  onRemovePerson: (personId: string) => void
  /** Present on shared lists: members are marked and can't be removed here. */
  shared?: SharedPeople
}

const STACK_MAX = 3

// "You" is the only solid avatar, so you can find yourself at a glance.
// The tint sits on an opaque base so overlapping avatars in the stack don't bleed into each other.
const Avatar = ({ name, isMe, size = 'md' }: { name: string; isMe?: boolean; size?: 'sm' | 'md' }) => (
  <span
    aria-hidden="true"
    className={`shrink-0 inline-flex rounded-full bg-surface select-none ${size === 'sm' ? 'w-8 h-8 ring-2 ring-surface' : 'w-10 h-10'}`}
  >
    <span
      className={`w-full h-full inline-flex items-center justify-center rounded-full font-semibold ${
        size === 'sm' ? 'text-[11px] tracking-tight' : 'text-callout'
      } ${isMe ? 'bg-accent text-on-accent' : 'bg-accent/15 text-accent'}`}
    >
      {initials(name)}
    </span>
  </span>
)

export const PeopleManager = ({ people, items = [], onAddPerson, onRemovePerson, shared }: PeopleManagerProps) => {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const label = shared ? t.peopleAndMembers : t.people
  const stack = people.slice(0, STACK_MAX)
  const overflow = people.length - stack.length

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        className="w-full mb-4 flex items-center gap-3 bg-surface rounded-group pl-3 pr-2 py-2 min-h-[56px] text-left active:bg-fill"
      >
        {people.length > 0 ? (
          <span className="flex -space-x-1.5 shrink-0">
            {stack.map(person => (
              <Avatar key={person.id} name={person.name} isMe={shared?.myPersonId === person.id} size="sm" />
            ))}
            {overflow > 0 && (
              <span aria-hidden="true" className="w-8 h-8 inline-flex items-center justify-center rounded-full ring-2 ring-surface bg-fill text-footnote font-semibold text-muted num">
                +{overflow}
              </span>
            )}
          </span>
        ) : (
          <span aria-hidden="true" className="w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-full border border-dashed border-muted text-muted">
            <PlusIcon className="w-4 h-4" />
          </span>
        )}
        <span className="flex-1 min-w-0">
          <span className="block text-callout font-semibold text-ink truncate">{label}</span>
          <span className="block text-footnote text-muted truncate">
            {people.length > 0 ? people.map(p => p.name).join(', ') : t.addPeople}
          </span>
        </span>
        {people.length > 0 && <span className="text-callout num text-muted">{people.length}</span>}
        <ChevronRightIcon className="w-4 h-4 shrink-0 text-muted" />
      </button>

      {isOpen && (
        <PeopleModal
          title={label}
          people={people}
          items={items}
          onAddPerson={onAddPerson}
          onRemovePerson={onRemovePerson}
          shared={shared}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

interface PeopleModalProps extends Required<Pick<PeopleManagerProps, 'people' | 'items' | 'onAddPerson' | 'onRemovePerson'>> {
  title: string
  shared?: SharedPeople
  onClose: () => void
}

const PeopleModal = ({ title, people, items, onAddPerson, onRemovePerson, shared, onClose }: PeopleModalProps) => {
  const { t } = useLanguage()
  useScrollLock(true)
  const [newName, setNewName] = useState('')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const counts = assignedItemCounts(items)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Drag the header down to dismiss, like a native sheet
  const [dragY, setDragY] = useState(0)
  const dragStartRef = useRef<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => { dragStartRef.current = e.touches[0].clientY }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartRef.current === null) return
    setDragY(Math.max(0, e.touches[0].clientY - dragStartRef.current))
  }
  const handleTouchEnd = () => {
    dragStartRef.current = null
    if (dragY > 100) onClose()
    setDragY(0)
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    onAddPerson(trimmed)
    setNewName('')
    inputRef.current?.focus()
  }

  // Removing someone with items reassigns those items to everyone, so ask first
  const handleRemove = (person: Person) => {
    if (counts[person.id]) setConfirmingId(person.id)
    else onRemovePerson(person.id)
  }

  const itemCountLabel = (count: number) =>
    count === 0 ? t.personNoItems : count === 1 ? t.personOneItem : t.personItemCount.replace('{count}', String(count))

  const isMember = (personId: string) => !!shared?.memberPersonIds.includes(personId)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="people-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
        className="bg-bg dark:bg-surface rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90dvh] flex flex-col shadow-xl animate-slide-up"
      >
        <div
          className="shrink-0 pl-4 pr-2 pt-2 pb-1"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex justify-center pb-1 sm:hidden">
            <div className="w-10 h-1 bg-hairline rounded-full" />
          </div>
          <div className="flex items-center justify-between">
            <h3 id="people-modal-title" className="text-title font-bold text-ink">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center rounded-full text-muted hover:bg-fill"
              aria-label={t.close}
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scroll-touch px-4 pt-2 pb-safe">
          {/* Add: the avatar previews the initials as you type */}
          <form onSubmit={handleAdd} className="flex items-center gap-3 bg-surface dark:bg-fill rounded-group pl-3 pr-1.5 py-1.5">
            {newName.trim() ? (
              <Avatar name={newName} />
            ) : (
              <span aria-hidden="true" className="w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-full border border-dashed border-muted text-muted">
                <PlusIcon className="w-5 h-5" />
              </span>
            )}
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t.addPerson}
              aria-label={t.addPerson}
              autoFocus={people.length === 0}
              autoCapitalize="words"
              autoComplete="off"
              enterKeyHint="done"
              className="flex-1 min-w-0 py-2 bg-transparent text-ink text-body placeholder:text-muted focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newName.trim()}
              className="px-4 min-h-[44px] bg-accent text-on-accent rounded-xl text-callout font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t.add}
            </button>
          </form>

          {people.length === 0 ? (
            <div className="flex flex-col items-center text-center px-6 py-10 text-muted">
              <UsersIcon className="w-10 h-10 mb-3" />
              <p className="text-callout max-w-xs">{t.peopleEmptyHint}</p>
            </div>
          ) : (
            <ul className="mt-4 bg-surface dark:bg-fill rounded-group overflow-hidden">
              {people.map((person, index) => {
                const isMe = shared?.myPersonId === person.id
                const member = isMember(person.id)
                const count = counts[person.id] ?? 0
                const confirming = confirmingId === person.id
                return (
                  <li key={person.id} className="flex items-center gap-3 pl-3">
                    <Avatar name={person.name} isMe={isMe} />
                    {/* Inset divider starts after the avatar, like iOS lists */}
                    <div className={`flex-1 min-w-0 flex items-center gap-2 pr-1 min-h-[60px] ${index > 0 ? 'border-t border-hairline' : ''}`}>
                      {confirming ? (
                        <div className="flex-1 min-w-0 pt-3 pb-1">
                          <p className="pr-2 text-footnote text-ink">
                            {t.removePersonMessage.replace('{name}', person.name)}
                          </p>
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setConfirmingId(null)}
                              className="px-3 min-h-[44px] text-callout text-ink rounded-xl hover:bg-fill"
                            >
                              {t.cancel}
                            </button>
                            <button
                              type="button"
                              onClick={() => { onRemovePerson(person.id); setConfirmingId(null) }}
                              className="px-3 min-h-[44px] text-callout font-semibold text-danger rounded-xl hover:bg-danger/10"
                              aria-label={t.removePersonTitle.replace('{name}', person.name)}
                            >
                              {t.remove}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0 py-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-body text-ink truncate">{person.name}</span>
                              {isMe && (
                                <span className="shrink-0 text-footnote font-semibold bg-accent/15 text-accent px-1.5 rounded-full">{t.you}</span>
                              )}
                              {member && (
                                <span role="img" aria-label={t.usingApp} title={t.usingApp} className="shrink-0 text-muted">
                                  <PhoneIcon className="w-4 h-4" />
                                </span>
                              )}
                            </div>
                            <span className="block text-footnote text-muted num">{itemCountLabel(count)}</span>
                          </div>
                          {!member && (
                            <button
                              type="button"
                              onClick={() => handleRemove(person)}
                              className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full text-muted hover:text-danger hover:bg-danger/10"
                              aria-label={t.removePerson.replace('{name}', person.name)}
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {shared && (
            <section aria-labelledby="people-invite-title" className="mt-6 mb-4">
              <h4 id="people-invite-title" className="px-1 pb-1.5 text-callout font-semibold text-ink">{t.inviteToList}</h4>
              <div className="bg-surface dark:bg-fill rounded-group p-4">
                <p className="text-footnote text-muted mb-3">{t.sharedListHint}</p>
                <button
                  type="button"
                  onClick={shared.onInvite}
                  disabled={shared.inviteDisabled}
                  className="w-full flex items-center justify-center gap-2 min-h-[48px] bg-accent/15 text-accent font-semibold rounded-xl active:bg-accent/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShareIcon className="w-5 h-5" />
                  {t.shareInviteLink}
                </button>
                {shared.inviteDisabled && (
                  <p className="mt-2 text-center text-footnote text-muted">{t.inviteWaitingConnection}</p>
                )}
                {shared.notice && (
                  <p role="status" className="mt-2 text-center text-footnote text-accent">{shared.notice}</p>
                )}
              </div>
            </section>
          )}
          {!shared && <div className="h-4" />}
        </div>
      </div>
    </div>
  )
}
