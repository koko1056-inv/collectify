import { Pocke } from "@/components/pocke/Pocke";

// アプリ全体で共通のフルスクリーンローディング画面
// （App.tsx の Suspense fallback / ProtectedRoute の認証チェック中に使用）
// 待っている間は、ポッケが袋をかかえてその場で弾む（動きを減らす設定の人には止めて出す）
export const LoadingScreen = () => (
  <div className="min-h-screen bg-loading-bg flex items-center justify-center" role="status" aria-busy="true">
    <div className="flex flex-col items-center gap-3">
      <Pocke pose="pouch" height={112} motion="bob" />
      <div className="flex gap-1.5" aria-hidden="true">
        <span className="h-2 w-2 rounded-full bg-primary/70 motion-safe:animate-bounce [animation-delay:-0.3s]" />
        <span className="h-2 w-2 rounded-full bg-primary/70 motion-safe:animate-bounce [animation-delay:-0.15s]" />
        <span className="h-2 w-2 rounded-full bg-primary/70 motion-safe:animate-bounce" />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  </div>
);
