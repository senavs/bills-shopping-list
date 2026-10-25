import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { arrayRemove, arrayUnion, deleteDoc, deleteField, doc, getDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore'

let env: RulesTestEnvironment
const listDoc = (id: string) => ({ id, name: 'L', updatedAt: 1, deleted: false })

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-billbuddy',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})
afterAll(() => env.cleanup())
beforeEach(() => env.clearFirestore())

const seed = () => env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'users/alice/lists/l1'), listDoc('l1')))

describe('firestore rules', () => {
  it('owner can create, update and read own lists', async () => {
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(db, 'users/alice/lists/l1'), listDoc('l1')))
    await assertSucceeds(setDoc(doc(db, 'users/alice/lists/l1'), { id: 'l1', updatedAt: 2, deleted: true }))
    await assertSucceeds(getDoc(doc(db, 'users/alice/lists/l1')))
  })

  it('another user cannot read or write', async () => {
    await seed()
    const db = env.authenticatedContext('bob').firestore()
    await assertFails(getDoc(doc(db, 'users/alice/lists/l1')))
    await assertFails(setDoc(doc(db, 'users/alice/lists/l2'), listDoc('l2')))
  })

  it('unauthenticated access is denied', async () => {
    await seed()
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'users/alice/lists/l1')))
  })

  it('document id must match the list id', async () => {
    const db = env.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(db, 'users/alice/lists/l1'), listDoc('other')))
  })

  it('hard deletes and a profile document are denied', async () => {
    await seed()
    const db = env.authenticatedContext('alice').firestore()
    await assertFails(deleteDoc(doc(db, 'users/alice/lists/l1')))
    await assertFails(setDoc(doc(db, 'users/alice'), { name: 'Alice' }))
  })
})

describe('shared lists rules', () => {
  const TOKEN = 'tok-0123456789abcdefghijklmnop'
  const parent = (over: Record<string, unknown> = {}) => ({
    id: 'L', ownerUid: 'alice', inviteToken: TOKEN, members: ['alice'], deleted: false, updatedAt: 1,
    name: 'Bar', type: 'bar', currency: 'BRL', taxPercentage: 0,
    memberPeople: { alice: 'p1' }, people: { p1: { name: 'Ana', position: 0 } }, sections: {},
    ...over,
  })
  const item = (id: string) => ({ id, name: id, quantity: 1, unitPrice: 1, selected: false, includeInTax: true, sectionId: null, position: 0, deleted: false, updatedAt: 1 })
  const seedShared = (over: Record<string, unknown> = {}) =>
    env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'sharedLists/L'), parent(over)))
  const as = (uid: string) => env.authenticatedContext(uid).firestore()
  const join = (uid: string, token: string) => {
    const db = as(uid)
    const batch = writeBatch(db)
    batch.set(doc(db, `sharedLists/L/joins/${uid}`), { token })
    batch.update(doc(db, 'sharedLists/L'), { members: arrayUnion(uid) })
    return batch.commit()
  }

  it('owner creates with only themselves as member', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'sharedLists/L'), parent()))
    await assertFails(setDoc(doc(as('alice'), 'sharedLists/M'), parent({ id: 'M', members: ['alice', 'bob'] })))
    await assertFails(setDoc(doc(as('bob'), 'sharedLists/N'), parent({ id: 'N' })))
    await assertFails(setDoc(doc(as('alice'), 'sharedLists/O'), parent({ id: 'O', inviteToken: 'short' })))
  })

  it('non-members cannot read the list or its items', async () => {
    await seedShared()
    await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'sharedLists/L/items/a'), item('a')))
    await assertFails(getDoc(doc(as('bob'), 'sharedLists/L')))
    await assertFails(getDoc(doc(as('bob'), 'sharedLists/L/items/a')))
    await assertSucceeds(getDoc(doc(as('alice'), 'sharedLists/L/items/a')))
  })

  it('joining needs the right token', async () => {
    await seedShared()
    await assertFails(join('bob', 'wrong-token-0123456789abcdef'))
    await assertSucceeds(join('bob', TOKEN))
    await assertSucceeds(getDoc(doc(as('bob'), 'sharedLists/L')))
  })

  it('after someone joined, a stranger still cannot join without the token', async () => {
    await seedShared()
    await assertSucceeds(join('bob', TOKEN))
    await assertFails(updateDoc(doc(as('carol'), 'sharedLists/L'), { members: arrayUnion('carol') }))
  })

  it('a member cannot add someone else or change protected fields', async () => {
    await seedShared({ members: ['alice', 'bob'] })
    const db = as('bob')
    await assertFails(updateDoc(doc(db, 'sharedLists/L'), { members: arrayUnion('carol') }))
    await assertFails(updateDoc(doc(db, 'sharedLists/L'), { ownerUid: 'bob' }))
    await assertFails(updateDoc(doc(db, 'sharedLists/L'), { inviteToken: 'x'.repeat(30) }))
    await assertFails(updateDoc(doc(db, 'sharedLists/L'), { deleted: true }))
    await assertSucceeds(updateDoc(doc(db, 'sharedLists/L'), { name: 'Pub', 'people.p2': { name: 'Bia', position: 1 } }))
  })

  it('members only set their own memberPeople entry', async () => {
    await seedShared({ members: ['alice', 'bob'] })
    await assertFails(updateDoc(doc(as('bob'), 'sharedLists/L'), { 'memberPeople.alice': 'p2' }))
    await assertSucceeds(updateDoc(doc(as('bob'), 'sharedLists/L'), { 'memberPeople.bob': 'p2' }))
  })

  it('only the owner deletes (tombstone); hard deletes never', async () => {
    await seedShared({ members: ['alice', 'bob'] })
    await assertFails(deleteDoc(doc(as('alice'), 'sharedLists/L')))
    await assertSucceeds(updateDoc(doc(as('alice'), 'sharedLists/L'), { deleted: true }))
  })

  it('leaving removes only yourself and your own memberPeople entry; the owner cannot leave', async () => {
    await seedShared({ members: ['alice', 'bob', 'carol'], memberPeople: { alice: 'p1', bob: 'p2', carol: 'p3' } })
    await assertFails(updateDoc(doc(as('bob'), 'sharedLists/L'), { members: arrayRemove('bob'), 'memberPeople.alice': deleteField() }))
    await assertFails(updateDoc(doc(as('bob'), 'sharedLists/L'), { members: arrayRemove('carol') }))
    await assertSucceeds(updateDoc(doc(as('bob'), 'sharedLists/L'), { members: arrayRemove('bob'), 'memberPeople.bob': deleteField() }))
    await assertFails(updateDoc(doc(as('alice'), 'sharedLists/L'), { members: arrayRemove('alice') }))
  })

  it('an 11th member cannot join', async () => {
    await seedShared({ members: ['alice', ...Array.from({ length: 9 }, (_, i) => `m${i}`)] })
    await assertFails(join('bob', TOKEN))
  })

  it('members write items with matching ids while the list is alive', async () => {
    await seedShared({ members: ['alice', 'bob'] })
    await assertSucceeds(setDoc(doc(as('bob'), 'sharedLists/L/items/a'), item('a')))
    await assertFails(setDoc(doc(as('bob'), 'sharedLists/L/items/b'), item('other')))
    await assertFails(setDoc(doc(as('carol'), 'sharedLists/L/items/c'), item('c')))
    await assertFails(deleteDoc(doc(as('bob'), 'sharedLists/L/items/a')))
    await env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), 'sharedLists/L'), { deleted: true }))
    await assertFails(setDoc(doc(as('bob'), 'sharedLists/L/items/d'), item('d')))
  })

  it('nobody edits a deleted list', async () => {
    await seedShared({ members: ['alice', 'bob'], deleted: true })
    await assertFails(updateDoc(doc(as('alice'), 'sharedLists/L'), { deleted: false }))
    await assertFails(updateDoc(doc(as('bob'), 'sharedLists/L'), { name: 'x' }))
  })
})
