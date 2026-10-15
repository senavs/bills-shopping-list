import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'

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
