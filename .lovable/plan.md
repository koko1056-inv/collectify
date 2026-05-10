## ゴール

1. PC表示を「モバイル版に合わせる」方針で揃える（差分があるところだけ）
2. 同担マッチング機能を、探索ページの「ユーザー」タブに**マッチセクション**として追加
3. 専用ページ `/matches` は廃止し、探索に集約

---

## 現状の主な差分（モバイル基準で揃える対象）

| 箇所 | モバイル | デスクトップ | 対応 |
|---|---|---|---|
| ナビゲーション | 下部固定Footer（AIスタジオ / 探索 / みつける / コレクション / プロフィール） | 上部Navbarに「AI Studio / Collection / 探索 / もっと見る（検索・同担マッチ・コミュニティ）」 | デスクトップNavbarをモバイルと同じ5項目に再構成 |
| 同担マッチへの導線 | なし | Navbar→もっと見る→同担マッチ | 両方とも探索→ユーザータブから入る形に統一 |
| コミュニティ（投稿） | Footerに無し | Navbarのもっと見るに有り | デスクトップのもっと見るメニューを廃止 |
| 検索（みつける） | Footer中央の大きなボタン | Navbarのもっと見る | デスクトップでも独立リンクに昇格 |
| プロフィール導線 | Footer右端の独立タブ | アバタードロップダウンの中 | デスクトップでもプロフィールを上位導線に |

> 上記以外に細かなdesktop専用の「<br className=hidden sm:block>」や「hidden sm:inline」は意味を持つレスポンシブ調整なので**残す**（モバイルでテキスト非表示にしているアイコン等）。

---

## 実装内容

### 1. デスクトップ Navbar をモバイルと揃える（`src/components/Navbar.tsx`）

デスクトップ版（`hidden sm:flex` ブロック）のメニューを、モバイル下部Footerと同じ5項目に再構成：

- AIスタジオ → `/ai-rooms`（または `/my-room?tab=studio`、現Footerと同じ）
- 探索 → `/explore`
- みつける（検索）→ `/search`（中央寄り、目立たせる）
- コレクション → `/collection`
- プロフィール → `/edit-profile`

「もっと見る」ドロップダウンは廃止。アバタードロップダウンには言語/テーマ/使い方/ログアウトのみを残す（プロフィール項目はナビ本体に上がるので削除）。

### 2. 探索ページのユーザータブにマッチセクションを追加（`src/components/explore/ExploreHub.tsx`）

`UsersTab` の上部に「あなたと相性の良いファン」セクションを追加：

- ログイン中ユーザーのみ表示（`useAuth`、`useMatches(user.id)` を利用）
- 上位 6〜8 件を `MatchCard` で**横スクロール**表示（モバイルでも読みやすい1.5枚見せレイアウト）
- セクションタイトル横に「もっと見る」リンクは置かない（専用ページ廃止のため）
- `CollectionDiffModal` も同セクションに組み込み（`compareWith` ステート）
- マッチ0件 or 未ログイン時はセクション非表示

その下に既存の「人気ユーザー一覧」グリッドはそのまま残す。

### 3. `/matches` ページの廃止

- `src/App.tsx` のルートを `<Route path="/matches" element={<Navigate to="/explore?tab=users" replace />} />` に変更
- `src/pages/Matches.tsx` は削除
- 残存リンク（Navbarの「もっと見る」内、その他参照箇所）はすべて削除または `/explore?tab=users` に置換

### 4. メモリ更新

`mem://index.md` の Core に「同担マッチは探索のユーザータブに集約。`/matches` は廃止して `/explore?tab=users` にリダイレクト」を追記。

---

## 影響範囲

**変更ファイル**
- `src/components/Navbar.tsx`（デスクトップメニュー再構成）
- `src/components/explore/ExploreHub.tsx`（UsersTab にマッチセクション追加）
- `src/App.tsx`（`/matches` をリダイレクトに）
- `mem://index.md`

**削除ファイル**
- `src/pages/Matches.tsx`

**触らないもの**
- モバイル Footer（既に基準なので無変更）
- 各ページ内部の `hidden sm:inline` 等の細かなレスポンシブ表示（意味のある調整）
- マッチ計算ロジック（`useMatches`, `MatchCard`, `CollectionDiffModal`）

---

## 確認したい点

「みつける（検索）」をデスクトップNavbarのどの位置に置くか — モバイルFooter同様に**中央**で目立たせるか、他項目と同列で良いかは実装時の調整事項とします（特に指定なければ同列で実装）。
