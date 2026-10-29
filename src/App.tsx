
import React from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ConsentBanner } from "@/components/legal/ConsentBanner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";
import { PageTourHost } from "@/components/onboarding/PageTourHost";
import { GuideHost } from "@/components/onboarding/GuideHost";
import { OnboardingRewardWatcher } from "@/components/onboarding/OnboardingRewardWatcher";
import { PockeCheerHost } from "@/components/pocke/PockeCheerHost";
import { PockeLoadHost } from "@/components/pocke/PockeLoadHost";
import { shouldRetryQuery, queryRetryDelay } from "@/utils/queryRetry";
import { PockeCompletionHost } from "@/components/pocke/PockeCompletionHost";
import { DailyRingHost } from "@/components/daily/DailyRingHost";
import { DailyLoginRewardHost } from "@/components/daily/DailyLoginRewardHost";
import { SubscriptionPointsHost } from "@/components/premium/SubscriptionPointsHost";
import { BadgeUnlockHost } from "@/components/badges/BadgeUnlockHost";
import { GuestPouchImporter } from "@/components/guest/GuestPouchImporter";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeColorProvider } from "@/contexts/ThemeColorContext";
import { ColorSchemeProvider } from "@/contexts/ColorSchemeContext";
import { Suspense, lazy } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RootRedirect } from "@/components/RootRedirect";
import { markRouteReady } from "@/utils/perf";
import { useLocation } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { OfflineBanner } from "@/components/OfflineBanner";
import { LiffAutoLink } from "@/components/LiffAutoLink";
import { CheckoutReturnHandler } from "@/components/CheckoutReturnHandler";
import { getTranslation, Language } from "@/translations";

// ルート切り替えごとに、描画完了タイミング（2フレーム後）を「初回表示時間」として記録
const RouteReadyTracker: React.FC = () => {
  const location = useLocation();
  React.useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => markRouteReady());
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [location.pathname]);
  return null;
};

// 画面遷移のたびにスクロール位置を先頭へ戻す。
// これが無いと、一覧を深くスクロールしたあとタブを切り替えた際に、
// 次の画面が途中の位置で表示されてしまう。
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    // iOS Safari は、キーボード表示中の拡大/キーボードを閉じた拍子に
    // visualViewport の offsetTop/scale が正規の状態（0 / 1）に戻らず残ることがある。
    // SPA だと画面遷移してもレイアウトビューポート自体はリロードされないため、
    // この「ズレた」状態が次の画面にも持ち越され、position: fixed の下タブが
    // 画面中段に浮いて見える。フォーカスを外してから先頭へスクロールし直すと、
    // ブラウザがこのズレを一緒に正規化してくれる。
    const vv = window.visualViewport;
    const hasLeftoverKeyboardOffset =
      !!vv && (vv.offsetTop > 0 || vv.scale !== 1);
    if (hasLeftoverKeyboardOffset && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// 主要ページも lazy 化して初回バンドルを縮小
const Search = lazy(() => import("./pages/Search").catch(() => ({ default: () => <div>Error loading page</div> })));
const Collection = lazy(() => import("./pages/Collection").catch(() => ({ default: () => <div>Error loading page</div> })));
const Oshi = lazy(() => import("./pages/Oshi"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Trade = lazy(() => import("./pages/Trade"));
const OshiReleases = lazy(() => import("./pages/OshiReleases"));
import { EditProfileRedirect, MyRoomRedirect } from "@/components/navigation/LegacyRedirects";
const ItemPostsFeed = lazy(() => import("./pages/ItemPostsFeed").catch(() => ({ default: () => <div>Error loading page</div> })));

// バックグラウンドで下部ナビ全タブのコードチャンクをプリフェッチ。
// 未プリフェッチのタブは初回タップ時に Suspense の全画面ローディングが挟まり
// 「表示→ロード」に見えるため、5タブ分を事前に読み込んでおく。
if (typeof window !== "undefined") {
  const prefetch = () => {
    import("./pages/Trade");
    import("./pages/Search");
    import("./pages/Collection");
    import("./pages/AiRooms");
    import("./pages/Explore");
    import("./pages/EditProfile");
  };
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(prefetch, { timeout: 2000 });
  } else {
    setTimeout(prefetch, 1500);
  }
}

// Lazy load only rarely used pages
const Login = lazy(() => import("./pages/Login").catch(() => ({ default: () => <div>Error loading page</div> })));
const GuestTry = lazy(() => import("./pages/GuestTry").catch(() => ({ default: () => <div>Error loading page</div> })));
const Admin = lazy(() => import("./pages/Admin").catch(() => ({ default: () => <div>Error loading page</div> })));
const AddItem = lazy(() => import("./pages/AddItem").catch(() => ({ default: () => <div>Error loading page</div> })));
const QuickAdd = lazy(() => import("./pages/QuickAdd").catch(() => ({ default: () => <div>Error loading page</div> })));
const UserProfile = lazy(() => import("./pages/UserProfile").catch(() => ({ default: () => <div>Error loading page</div> })));
const EditProfile = lazy(() => import("./pages/EditProfile").catch(() => ({ default: () => <div>Error loading page</div> })));
const Messages = lazy(() => import("./pages/Messages").catch(() => ({ default: () => <div>Error loading page</div> })));
const Explore = lazy(() => import("./pages/Explore").catch(() => ({ default: () => <div>Error loading page</div> })));
const RoomView = lazy(() => import("./pages/RoomView").catch(() => ({ default: () => <div>Error loading page</div> })));
const PointShop = lazy(() => import("./pages/PointShop").catch(() => ({ default: () => <div>Error loading page</div> })));
const PointsEarn = lazy(() => import("./pages/PointsEarn").catch(() => ({ default: () => <div>Error loading page</div> })));
const Spending = lazy(() => import("./pages/Spending").catch(() => ({ default: () => <div>Error loading page</div> })));
const HowToUse = lazy(() => import("./pages/HowToUse").catch(() => ({ default: () => <div>Error loading page</div> })));
const ImageSearch = lazy(() => import("./pages/ImageSearch").catch(() => ({ default: () => <div>Error loading page</div> })));
const AiRooms = lazy(() => import("./pages/AiRooms").catch(() => ({ default: () => <div>Error loading page</div> })));
const InviteRedirect = lazy(() => import("./pages/InviteRedirect").catch(() => ({ default: () => <div>Error loading page</div> })));

const AiWorkDetail = lazy(() => import("./pages/AiWorkDetail").catch(() => ({ default: () => <div>Error loading page</div> })));
const ItemPublic = lazy(() => import("./pages/ItemPublic").catch(() => ({ default: () => <div>Error loading page</div> })));
const CharacterPage = lazy(() => import("./pages/CharacterPage").catch(() => ({ default: () => <div>Error loading page</div> })));
const AiAvatarDetail = lazy(() => import("./pages/AiAvatarDetail").catch(() => ({ default: () => <div>Error loading page</div> })));
const Privacy = lazy(() => import("./pages/Privacy").catch(() => ({ default: () => <div>Error loading page</div> })));
const Terms = lazy(() => import("./pages/Terms").catch(() => ({ default: () => <div>Error loading page</div> })));
const Tokushoho = lazy(() => import("./pages/Tokushoho").catch(() => ({ default: () => <div>Error loading page</div> })));

// queryClient はモジュールスコープのため、言語は localStorage から直接解決する
const currentLanguage = (): Language => {
  try {
    return localStorage.getItem("app-language") === "en" ? "en" : "ja";
  } catch {
    return "ja";
  }
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      console.error("Query error:", query.queryKey, error);
      // 読み込み失敗の知らせは、赤いトーストではなく PockeLoadHost（ポッケの「もう一度読み込む」）が出す。
      // キャッシュが無い＝画面にデータを出せないときだけ・meta.silentError のクエリは出さない、は同じ
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      console.error("Mutation error:", error);
      // 呼び出し側で個別に onError 処理している場合は二重通知しない
      if (!mutation.options.onError) {
        toast.error(getTranslation(currentLanguage(), "system.requestFailed"), { id: "mutation-error" });
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10分間はキャッシュを使用
      gcTime: 1000 * 60 * 60, // 1時間キャッシュを保持
      // 一時的な失敗（通信・5xx・時間切れ）だけ、1秒→2秒（ゆらぎ付き）あけて2回まで再試行する。
      // 権限なし・見つからない等は何度やっても同じなので再試行しない（utils/queryRetry）
      retry: shouldRetryQuery,
      retryDelay: (attemptIndex) => queryRetryDelay(attemptIndex),
      refetchOnWindowFocus: false,
      refetchOnMount: false, // マウント時の再取得を防ぐ
      refetchOnReconnect: false, // ネット復帰時の再取得も抑制（必要時は明示的に invalidate）
      networkMode: 'online', // オンライン時のみクエリ実行
    },
    mutations: {
      retry: 1, // ミューテーションの再試行回数を制限
      networkMode: 'online',
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ColorSchemeProvider>
        <ThemeColorProvider>
          <BrowserRouter>
            <AuthProvider>
              <OnboardingProvider>
                <TooltipProvider>
                  <Sonner />
                  <ConsentBanner />
                  <RouteReadyTracker />
                  <ScrollToTop />
                  <OfflineBanner />
                  <LiffAutoLink />
                  <CheckoutReturnHandler />
                  <AppErrorBoundary>
                  <Suspense fallback={<LoadingScreen />}>
                    <Routes>
                      <Route path="/" element={<RootRedirect />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/tokushoho" element={<Tokushoho />} />
                      <Route path="/legal" element={<Navigate to="/terms" replace />} />
                      <Route path="/login" element={<Login />} />
                      {/* ログインなしのおためし（ポッケと、推しのグッズを袋に入れてみる） */}
                      <Route path="/try" element={<GuestTry />} />
                      {/* Public routes */}
                      <Route path="/user/:userId" element={<UserProfile />} />
                      <Route path="/explore" element={<Explore />} />
                      <Route path="/rooms/explore" element={<Navigate to="/explore?tab=rooms" replace />} />
                      <Route path="/room/:roomId" element={<RoomView />} />
                      <Route path="/ai-work/:id" element={<AiWorkDetail />} />
                      <Route path="/item/:id" element={<ItemPublic />} />
                      {/* キャラページ。ゲストも見られる（所持率のかわりに登録のおすすめ） */}
                      <Route path="/character/:tagId" element={<CharacterPage />} />
                      <Route path="/ai-avatar/:id" element={<AiAvatarDetail />} />
                      <Route path="/how-to-use" element={<HowToUse />} />
                      <Route path="/invite/:code" element={<InviteRedirect />} />
                      {/* Protected routes — require authentication */}
                      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Admin /></ProtectedRoute>} />
                      <Route path="/add-item" element={<ProtectedRoute><AddItem /></ProtectedRoute>} />
                      <Route path="/quick-add" element={<ProtectedRoute><QuickAdd /></ProtectedRoute>} />
                      <Route path="/me" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
                      <Route path="/edit-profile" element={<EditProfileRedirect />} />
                      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                      <Route path="/oshi" element={<ProtectedRoute><Oshi /></ProtectedRoute>} />
                      {/* 旧「投稿・投票・チャレンジ」は廃止。いまの投稿は「みんな」の投稿タブにある */}
                      <Route path="/posts" element={<Navigate to="/explore?tab=posts" replace />} />
                      <Route path="/item-posts" element={<ProtectedRoute><ItemPostsFeed /></ProtectedRoute>} />
                      <Route path="/post/:postId" element={<ProtectedRoute><ItemPostsFeed /></ProtectedRoute>} />
                      <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
                      <Route path="/trade" element={<ProtectedRoute><Trade /></ProtectedRoute>} />
                      <Route path="/releases" element={<ProtectedRoute><OshiReleases /></ProtectedRoute>} />
                      <Route path="/collection" element={<ProtectedRoute><Collection /></ProtectedRoute>} />
                      <Route path="/my-room" element={<MyRoomRedirect />} />
                      <Route path="/image-search" element={<ProtectedRoute><ImageSearch /></ProtectedRoute>} />
                      <Route path="/ai-rooms" element={<ProtectedRoute><AiRooms /></ProtectedRoute>} />
                      <Route path="/matches" element={<Navigate to="/explore?tab=users" replace />} />
                      <Route path="/point-shop" element={<ProtectedRoute><PointShop /></ProtectedRoute>} />
                      {/* ポイントのもらい方（ポイントショップ・マイページの「楽しむ」・コレクションの炎から入る） */}
                      <Route path="/point-shop/earn" element={<ProtectedRoute><PointsEarn /></ProtectedRoute>} />
                      <Route path="/spending" element={<ProtectedRoute><Spending /></ProtectedRoute>} />
                      <Route path="/points" element={<Navigate to="/point-shop" replace />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                  {/* 初回ウェルカムと画面ガイドは特定のページに紐づけない。
                      ページ内に置くとそのページへ行かない人には一度も出ない。 */}
                  <OnboardingGate />
                  <PageTourHost />
                  <GuideHost />
                  <OnboardingRewardWatcher />
                  {/* グッズを入れたときに画面のすみで跳ねるポッケ（どの画面から登録しても出す） */}
                  <PockeCheerHost />
                  {/* 読み込みに時間がかかる・うまくいかないときのポッケ（左下） */}
                  <PockeLoadHost />
                  {/* 作品・シリーズがそろった瞬間のお祝い */}
                  <PockeCompletionHost />
                  <DailyRingHost />
                  <DailyLoginRewardHost />
                  {/* サブスクの毎月のポイント（契約中の人だけ。開いたときに受け取る） */}
                  <SubscriptionPointsHost />
                  <BadgeUnlockHost />
                  <GuestPouchImporter />
                  </AppErrorBoundary>
                </TooltipProvider>
              </OnboardingProvider>
            </AuthProvider>
          </BrowserRouter>
        </ThemeColorProvider>
        </ColorSchemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;
