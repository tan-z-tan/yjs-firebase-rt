// src/Editor.tsx
import React, { useEffect, useState } from 'react'
import * as Y from 'yjs'
import { useParams } from 'react-router-dom'
import { initYDocWithFirebase } from './yFirebase'

export const Editor: React.FC = () => {
  const { docId } = useParams<{ docId: string }>()
  const [doc, setDoc] = useState<Y.Doc | null>(null)
  const [ytext, setYText] = useState<Y.Text | null>(null)
  const [value, setValue] = useState('')
  const [createSnapshot, setCreateSnapshot] = useState<() => Promise<void>>()

  useEffect(() => {
    if (!docId) return

    let destroy = () => { }

      ; (async () => {
        const { doc, ytext, createSnapshot } = await initYDocWithFirebase(docId)
        setDoc(doc)
        setYText(ytext)
        setCreateSnapshot(() => createSnapshot)

        // 初期テキスト
        setValue(ytext.toString())

        // Yjs -> React の同期
        const observer = () => {
          setValue(ytext.toString())
        }
        ytext.observe(observer)

        destroy = () => {
          ytext.unobserve(observer)
          doc.destroy()
        }
      })()

    return () => {
      destroy()
    }
  }, [docId])

  if (!ytext) {
    return <div style={{ padding: 16 }}>Loading...</div>
  }

  // React -> Yjs の同期（超シンプル版：毎回全置き換え）
  const onChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    const newVal = e.target.value
    const d = ytext.doc
    if (!d) return
    d.transact(() => {
      ytext.delete(0, ytext.length)
      ytext.insert(0, newVal)
    })
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Yjs + Firebase Realtime DB POC</h1>
      <p>Document ID: <strong>{docId}</strong></p>
      <button
        onClick={() => {
          createSnapshot && createSnapshot()
        }}
      >
        Create Snapshot
      </button>
      <textarea
        style={{ width: '100%', height: 300, marginTop: 8 }}
        value={value}
        onChange={onChange}
      />
      <p style={{ marginTop: 8, fontSize: 12 }}>
        別タブや別ブラウザでこの画面を開いて同じテキストを編集すると、
        Yjs + Firebase 経由で共同編集が体験できます。
      </p>
    </div>
  )
}
