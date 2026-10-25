import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLists } from '../../hooks/useLists'
import { useLanguage } from '../../contexts/LanguageContext'
import { useSync } from '../../contexts/SyncContext'
import { useSharedSync } from '../../contexts/SharedSyncContext'
import { MemberNameForm } from './MemberNameForm'

type JoinState = 'joining' | 'waiting' | 'invalid' | 'network'

/**
 * #/join/:listId?t=token. Signed out: sign in (the redirect comes back here).
 * Signed in: join, wait for the list to arrive, then ask the member's name once.
 */
export const JoinPage = () => {
  const { listId = '' } = useParams<{ listId: string }>()
  const [params] = useSearchParams()
  const token = params.get('t')
  const navigate = useNavigate()
  const { t } = useLanguage()
  const sync = useSync()
  const { joinList } = useSharedSync()
  const { lists, addMemberPerson } = useLists()

  const [state, setState] = useState<JoinState>('joining')
  const [attempt, setAttempt] = useState(0)
  const startedRef = useRef(-1)

  const list = lists.find(l => l.id === listId && l.shared)
  const linked = !!(list && sync.uid && list.shared?.memberPeople?.[sync.uid])

  useEffect(() => {
    if (linked) navigate(`/lists/${listId}`, { replace: true })
  }, [linked, listId, navigate])

  // Already have the list locally (already a member): no need to join again
  useEffect(() => {
    if (!token || !sync.uid || list || startedRef.current === attempt) return
    startedRef.current = attempt
    setState('joining')
    void joinList(listId, token).then(result => setState(result === 'ok' ? 'waiting' : result))
  }, [token, sync.uid, list, attempt, listId, joinList])

  const handleName = (name: string) => {
    if (list && sync.uid) addMemberPerson(list.id, sync.uid, name)
  }

  const content = () => {
    if (!token || sync.status === 'disabled' || state === 'invalid') {
      return <p className="text-body text-danger">{t.joinInvalid}</p>
    }
    if (!sync.uid) {
      return (
        <button
          onPointerDown={sync.prepare}
          onClick={() => { void sync.signIn() }}
          className="px-5 min-h-[44px] bg-accent text-on-accent font-semibold active:opacity-80 rounded-xl"
        >
          {t.joinSignIn}
        </button>
      )
    }
    if (state === 'network' && !list) {
      return (
        <div>
          <p className="text-body text-muted mb-3">{t.joinNetworkError}</p>
          <button onClick={() => setAttempt(a => a + 1)} className="px-4 min-h-[44px] text-accent font-semibold rounded-xl hover:bg-fill">
            {t.joinRetry}
          </button>
        </div>
      )
    }
    if (!list || linked) return <p className="text-body text-muted">{t.joinJoining}</p>
    return (
      <div>
        <p className="text-title font-semibold text-ink mb-3">{list.name}</p>
        <MemberNameForm onSubmit={handleName} />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-bg pt-safe">
      <div className="container mx-auto p-4 max-w-2xl">
        <h1 className="text-large-title font-bold text-ink mb-6">{t.joinTitle}</h1>
        <div className="bg-surface rounded-group p-4">{content()}</div>
      </div>
    </div>
  )
}
