
## やること

ユーザーから2つの要望:
1. **登録したグッズが探すページに反映されるのが遅い** → キャッシュ戦略の改善
2. **一括登録時にコンテンツを全アイテム共通でまとめて選択したい** → MultipleItemsForm に「全件まとめて適用」機能追加

---

## 1. 探すページへの反映を高速化

### 現状の問題
- `useOfficialItems` は `staleTime: 0` だが、Search.tsx の Realtime 購読は `official-items` キャッシュキーを invalidate しているのに対し、フックは `official-items`（同一）を使用しているのでキー自体は一致している
- ただし、登録直後の画面遷移（AdminItemForm → Search）後、React Query がバックグラウンドフェッチ中の間に古いキャッシュを表示してしまう
- `MultipleItemsForm` の onSubmit はループで1件ずつ insert しているが、完了時にクライアント側で `queryClient.invalidateQueries(['official-items'])` を呼んでいない（Realtime 任せ）

### 改善策
- **AdminItemForm.tsx (単一/複数登録 両方)**: 登録成功直後に `queryClient.invalidateQueries({ queryKey: ['official-items'] })` と `refetchQueries` を明示的に実行
- **useOfficialItems.ts**: `staleTime: 0` のままだが `refetchOnMount: 'always'` を追加。Search ページに戻った瞬間に必ず再取得
- **MultipleItemsForm の onSubmit**: ループ内 insert を `Promise.all` で並列化（Storage アップロードを含めて速度向上）。さらに insert を1回の bulk insert にまとめられる部分はまとめる

---

## 2. コンテンツの一括選択機能

### MultipleItemsForm.tsx の上部に「全件にまとめて適用」セクションを追加
- コンテンツ選択 Select（既存の ContentSection を流用）
- アイテムタイプ選択（official / fanmade）
- 「全件に適用」ボタン → クリックすると state の `items` 全件の `content_name` / `item_type` を一括更新
- 各カードでは引き続き個別に上書きも可能

UI イメージ:
```text
┌─────────────────────────────────────────┐
│ 一括設定（全 12 件に適用）              │
│ コンテンツ: [呪術廻戦       ▼]          │
│ タイプ:     [公式グッズ     ▼]          │
│              [全件に適用]               │
└─────────────────────────────────────────┘

[個別カード×N（既存UI、個別編集も可）]
```

---

## 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `src/components/AdminItemForm.tsx` | 登録成功時に `queryClient.invalidateQueries` 追加、bulk insert を並列化 |
| `src/components/admin-item-form/MultipleItemsForm.tsx` | 上部に一括適用セクションを追加、`applyToAll` ハンドラ実装 |
| `src/hooks/useOfficialItems.ts` | `refetchOnMount: 'always'` 追加 |

DB 変更なし。
