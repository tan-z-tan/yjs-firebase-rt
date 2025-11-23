// src/yFirebase.ts
import * as Y from 'yjs'
import {
  ref,
  get,
  child,
  push,
  set,
  onChildAdded,
} from 'firebase/database'
import { signInAnonymously } from 'firebase/auth'
import { db, auth } from './firebase'

/**
 * 特定の docId の Y.Doc を Firebase Realtime DB に接続して初期化
 */
export async function initYDocWithFirebase(docId: string) {
  await signInAnonymously(auth)
  const doc = new Y.Doc()
  const ytext = doc.getText('content')

  const docRef = ref(db, `docs/${docId}`)
  const metaRef = child(docRef, 'meta')
  const snapshotsRef = child(docRef, 'snapshots')
  const updatesRef = child(docRef, 'updates')

  // ---- 1. snapshotから復元 ----
  const metaSnap = await get(metaRef)
  let lastUpdateId: string | null = null

  if (metaSnap.exists()) {
    const meta = metaSnap.val() as { latestSnapshotId?: string | null }
    const latestSnapshotId = meta.latestSnapshotId ?? null

    if (latestSnapshotId) {
      const snapSnap = await get(child(snapshotsRef, latestSnapshotId))
      if (snapSnap.exists()) {
        const snapVal = snapSnap.val() as {
          data: number[]
          lastUpdateId: string | null
        }
        const snapshotUpdate = new Uint8Array(snapVal.data)
        // remote からの適用だとわかるように origin に 'remote' を渡す
        Y.applyUpdate(doc, snapshotUpdate, 'remote')
        lastUpdateId = snapVal.lastUpdateId
      }
    }
  }

  // ---- 2. snapshot 以降の updates を適用 ----
  const updatesSnap = await get(updatesRef)
  let lastSeenUpdateId: string | null = lastUpdateId

  if (updatesSnap.exists()) {
    updatesSnap.forEach((childSnap) => {
      const key = childSnap.key!
      const val = childSnap.val() as { data: number[] }

      // lastUpdateId より後のものだけ適用
      if (!lastUpdateId || key > lastUpdateId) {
        const update = new Uint8Array(val.data)
        Y.applyUpdate(doc, update, 'remote')
        lastSeenUpdateId = key
      }
    })
  }

  // ---- 3. 以後の updates をリアルタイム購読 ----
  onChildAdded(updatesRef, (snap) => {
    const key = snap.key!
    const val = snap.val() as { data: number[] }

    // すでに見た update はスキップ
    if (lastSeenUpdateId && key <= lastSeenUpdateId) return

    const update = new Uint8Array(val.data)
    Y.applyUpdate(doc, update, 'remote')
    lastSeenUpdateId = key
  })

  // ---- 4. ローカル更新を Firebase に送る ----
  doc.on('update', (update: Uint8Array, origin) => {
    if (origin === 'remote') return

    const newRef = push(updatesRef)
    set(newRef, {
      data: Array.from(update),
      createdAt: Date.now(),
    })
  })

  // ---- 5. Snapshot 作成用ヘルパ ----
  async function createSnapshot() {
    const snapshot = Y.encodeStateAsUpdate(doc)
    const newSnapRef = push(snapshotsRef)
    const snapId = newSnapRef.key!

    await set(newSnapRef, {
      data: Array.from(snapshot),
      lastUpdateId: lastSeenUpdateId,
      createdAt: Date.now(),
    })

    await set(metaRef, { latestSnapshotId: snapId })
  }

  return { doc, ytext, createSnapshot }
}
