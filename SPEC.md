# プロジェクト概要

Yjs と Firebase Realtime Database を使った、最小構成の共同編集 POC アプリを作りたい。

## 目的

- CRDT ライブラリ Yjs を使って、テキストドキュメントの状態管理とマージを行う。
- Firebase Realtime Database を「更新(update)のブロードキャスト」と「スナップショット保存」のストアとして使う。
- WebSocket サーバ (y-websocket) を使わず、Firebase だけでリアルタイム同期がどこまでできるかを検証する。

## 技術スタック

- フロントエンド: React + TypeScript (Vite)
- 状態管理 / CRDT: Yjs
- リアルタイムバックエンド: Firebase Realtime Database
- 認証などは今回の POC では扱わず、全ユーザ匿名前提でよい

## データ構造 (Firebase RTDB)
docs/
{docId}/
meta/
latestSnapshotId: string | null
snapshots/
{snapshotId}/
data: number[]          // Y.encodeStateAsUpdate(doc) の結果 (Uint8Array) を配列化
lastUpdateId: string?   // この snapshot に含まれている最後の update のキー
createdAt: number
updates/
{updateId}/
data: number[]          // doc.on(“update”) で得られる Uint8Array を配列化
createdAt: number

- `updates/*` は「Yjs update ログ」の append-only なイベントログ
- `snapshots/*` は「ある時点までの全 update を適用済みの完全状態」
- `meta/latestSnapshotId` は「最新 snapshot へのポインタ」

## クライアント側の挙動

1. アプリ起動時に URL パス `/doc/{docId}` から `docId` を取得してそのドキュメントを扱う。
   - ルート `/` にアクセスした場合は、ランダムな `docId` を生成して `/doc/{newDocId}` にリダイレクトする。
2. 初期同期フロー:
   - `docs/docA/meta/latestSnapshotId` を読む
   - あれば `snapshots/{latestSnapshotId}` を取得し、 `Y.applyUpdate(doc, snapshotUpdate)` で Y.Doc に適用
   - その snapshot に記録された `lastUpdateId` 以降の `updates/*` を列挙して順に `Y.applyUpdate(doc, update)` する
3. その後:
   - `updates/` に対して `onChildAdded` で購読し、新しい update が来るたびに `Y.applyUpdate(doc, update)` する
   - ローカルで doc が更新されたときは `doc.on("update")` から Firebase に新しい update を `push()` する

## UI 要件

- 単一ページのSPAでよい。
- コンポーネント `Editor` を用意し、1つの `<textarea>` でドキュメントのテキストを編集できるようにする。
- `Editor` では:
  - `Y.Doc` と `Y.Text` を初期化し、Firebase との同期を行うヘルパ関数 (`initYDocWithFirebase(docId)`) を呼び出す。
  - `Y.Text` の内容を React の state に反映して `<textarea>` に表示。
  - `<textarea>` の onChange で、Y.Text の内容を (シンプルな実装でよいので) 全削除→全挿入で差し替える。
- 「Create Snapshot」ボタンを1つ用意し、押したときに:
  - `encodeStateAsUpdate(doc)` を実行して snapshot を Firebase の `snapshots/*` に保存する。
  - 同時に `meta/latestSnapshotId` をその snapshot の ID に更新する。

## 非要件 (今回の POC ではやらないこと)

- ユーザ認証・権限管理
- ドキュメント一覧画面
- 履歴UIやタイムトラベル
- update / snapshot の GC (古いログ削除) の自動化
- リッチテキストエディタ (Tiptap など) との統合
- オフライン対応 / IndexedDB 永続化

## 実装タスク

1. Vite + React + TypeScript でプロジェクトを作成する。
2. `firebase` と `yjs` を依存に追加する。
3. `src/firebase.ts` で Firebase App と Realtime Database を初期化する。
4. `src/yFirebase.ts` に、以下を行うヘルパ関数 `initYDocWithFirebase(docId)` を実装する:
   - Y.Doc と Y.Text の生成
   - Firebase から snapshot / updates を使って初期状態を復元
   - updates のリアルタイム購読
   - doc.on("update") から Firebase に update を push
   - snapshot 作成用の `createSnapshot()` 関数
5. `src/Editor.tsx` に、上記ヘルパを使ったテキストエディタコンポーネントを実装する。
6. `src/App.tsx` で `Editor` コンポーネントを表示するようにする。
7. ブラウザタブを複数開いて、同じテキストがリアルタイムに同期されることを確認する。