# Yjs + Firebase Realtime Database POC

Yjs と Firebase Realtime Database を組み合わせた、サーバーレスなリアルタイム共同編集アプリケーションの Proof of Concept (POC) です。
`y-websocket` などの専用 WebSocket サーバーを使用せず、Firebase Realtime Database のみで同期を実現しています。

## 目的

*   **サーバーレス同期の検証**: 専用の WebSocket サーバーを立てずに、Firebase だけでどこまで実用的なリアルタイム同期が可能か検証する。
*   **データ永続化**: Firebase を「更新イベント(updates)のログ」および「スナップショット」のストアとして利用し、ドキュメントの状態を永続化する。

## 技術スタック

*   **Frontend**: React, TypeScript, Vite
*   **Routing**: React Router
*   **CRDT / State Management**: Yjs
*   **Backend**: Firebase Realtime Database (Authentication: Anonymous)

## アーキテクチャ

Firebase Realtime Database 上で以下のようなデータ構造を持ちます。

*   **`updates/`**: Yjs の更新差分 (`Uint8Array`) を時系列順に保存する Append-only なログ。
*   **`snapshots/`**: ある時点までの全更新を適用した完全な状態 (`Y.encodeStateAsUpdate`)。
*   **`meta/`**: 最新のスナップショット ID などを管理。

クライアントは初期化時に「最新のスナップショット」＋「それ以降の差分」を取得して状態を復元し、以降は `onChildAdded` でリアルタイムに差分を受信・適用します。

## 機能

*   **リアルタイム共同編集**: 複数のブラウザ/タブで同じ URL を開くと、テキスト入力がリアルタイムに同期されます。
*   **複数ドキュメント対応**: `/doc/{docId}` の URL で個別のドキュメントを作成・編集できます。
*   **スナップショット作成**: 手動でスナップショットを作成し、次回読み込み時のパフォーマンスを最適化できます（古いログの適用をスキップ）。

## セットアップ

1. プロジェクトのルートディレクトリに `.env` ファイルを作成します。`.env.example` を参考にしてください。

```bash
cp .env.example .env
```

2. `.env` ファイルに Firebase プロジェクトの設定値を入力します。

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## 実行方法

### 1. インストール

```bash
pnpm install
```

### 2. 開発サーバー起動

```bash
pnpm dev
```

ブラウザで `http://localhost:5175` にアクセスしてください。
自動的にランダムなドキュメント ID が生成され、エディタ画面にリダイレクトされます。
URL をコピーして別のタブで開くと、共同編集が試せます。

## ライセンス

MIT
