# パフォーマンス最適化プラン

各ページの遷移と読み込みを軽くするため、以下4つの観点で改善します。コード変更のみで完結し、見た目や機能は変えません。

## 現状の問題点

調査の結果、主に4つのボトルネックがありました：

1. **メインページ（Search/MyRoom/Collection/Posts/ItemPostsFeed）が直接importされている** → 初回ロードで全部バンドル化され、初回JSが肥大化
2. **`useProfile` が `refetchOnMount: "always"` & `refetchOnWindowFocus: "always"`** → 画面遷移するたびにプロフィール再取得が走り、待ち時間の原因
3. **vite.config に手動 chunk 分割がない** → react/three.js/recharts/framer-motion などの巨大ライブラリが1チャンクに混ざりキャッシュが効きにくい
4. **`Search.tsx` でフィルタリングが毎レンダー実行・`useEffect` で `setSearchParams` を呼び再レンダーループ気味** → タブ切替時のもたつき

## 変更内容

### 1. ルート分割の見直し（`src/App.tsx`）
- 直接 import している `Search` / `Collection` / `Posts` / `MyRoom` / `ItemPostsFeed` を全て `lazy()` 化
- `MyRoom` のみ `/` のデフォルト遷移先なので prefetch（マウント時に裏で `import()` 実行）
- これで初回バンドルが大幅に小さくなり、初期表示が速くなる

### 2. Vite の手動チャンク分割（`vite.config.ts`）
`build.rollupOptions.output.manualChunks` を追加して、以下をベンダー分離：
- `react-vendor`: react, react-dom, react-router-dom
- `ui-vendor`: @radix-ui/*, lucide-react
- `three-vendor`: three, @react-three/*, postprocessing
- `chart-vendor`: recharts
- `motion-vendor`: framer-motion
- `supabase-vendor`: @supabase/*

→ ページ間移動時に共通ライブラリがブラウザキャッシュから即読みされる

### 3. データ取得の最適化
- **`src/hooks/useProfile.ts`**: `refetchOnMount: "always"` → `false`、`refetchOnWindowFocus: "always"` → `false`、`staleTime` を 5分に延長。プロフィール変更時は `refetchProfile()` を明示的に呼ぶ箇所がすでにあるので問題なし
- **`src/App.tsx` の QueryClient**: 既に `staleTime: 10分` だが、`refetchOnReconnect: false` も追加してネット復帰時の不要な再取得を抑制

### 4. Search ページの再レンダー削減（`src/pages/Search.tsx`）
- `filteredItems` を `useMemo` 化（現在は毎レンダー filter 実行）
- `activeFilterCount` を `useMemo` 化
- タブ切替の `handleTabChange` を `useCallback` 化

### 5. 画像読み込みの改善（`src/components/ui/lazy-image.tsx`）
- IntersectionObserver の `rootMargin` を `100px` → `300px` に拡大して先読み距離を増やす（体感の表示速度向上）
- `decoding="async"` 属性を追加

## 技術的な詳細

```text
[初回ロード時のバンドル構成 Before]
main.js (~1.5MB) ← 全ページ + 全ライブラリ

[After]
main.js (~300KB)             ← ルーター + 共通レイアウト
react-vendor.js (~150KB)     ← キャッシュされ全ページで再利用
ui-vendor.js (~200KB)        ← 同上
three-vendor.js (~600KB)     ← /room/* に入った時だけロード
[page].js (~50-100KB each)   ← 該当ページに行った時だけロード
```

## 期待効果

- 初回表示: 体感 30〜50% 高速化（バンドル分割 + lazy 化）
- ページ遷移: プロフィール再取得が消えるので 200〜500ms 短縮
- リピート訪問: ベンダーチャンクのキャッシュが効き、ほぼ即時表示

## 影響範囲（変更ファイル）

- `src/App.tsx`
- `vite.config.ts`
- `src/hooks/useProfile.ts`
- `src/pages/Search.tsx`
- `src/components/ui/lazy-image.tsx`

機能・UI には変更ありません。承認いただければ実装に移ります。