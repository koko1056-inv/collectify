
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeColorProvider } from "@/contexts/ThemeColorContext";
import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RootRedirect } from "@/components/RootRedirect";
import { markRouteReady } from "@/utils/perf";
import { useLocation } from "react-router-dom";

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

// 主要ページも lazy 化して初回バンドルを縮小（MyRoom はデフォルト遷移先なので即プリフェッチ）
const MyRoom = lazy(() => import("./pages/MyRoom").catch(() => ({ default: () => <div>Error loading page</div> })));
const Search = lazy(() => import("./pages/Search").catch(() => ({ default: () => <div>Error loading page</div> })));
const Collection = lazy(() => import("./pages/Collection").catch(() => ({ default: () => <div>Error loading page</div> })));
const Posts = lazy(() => import("./pages/Posts"));
const ItemPostsFeed = lazy(() => import("./pages/ItemPostsFeed").catch(() => ({ default: () => <div>Error loading page</div> })));

// バックグラウンドで主要ページをプリフェッチ
if (typeof window !== "undefined") {
  const prefetch = () => {
    import("./pages/MyRoom");
    import("./pages/Search");
    import("./pages/Collection");
  };
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(prefetch, { timeout: 2000 });
  } else {
    setTimeout(prefetch, 1500);
  }
}

// Lazy load only rarely used pages
const Login = lazy(() => import("./pages/Login").catch(() => ({ default: () => <div>Error loading page</div> })));
const Admin = lazy(() => import("./pages/Admin").catch(() => ({ default: () => <div>Error loading page</div> })));
const AddItem = lazy(() => import("./pages/AddItem").catch(() => ({ default: () => <div>Error loading page</div> })));
const QuickAdd = lazy(() => import("./pages/QuickAdd").catch(() => ({ default: () => <div>Error loading page</div> })));
const UserProfile = lazy(() => import("./pages/UserProfile").catch(() => ({ default: () => <div>Error loading page</div> })));
const EditProfile = lazy(() => import("./pages/EditProfile").catch(() => ({ default: () => <div>Error loading page</div> })));
const Messages = lazy(() => import("./pages/Messages").catch(() => ({ default: () => <div>Error loading page</div> })));
const Explore = lazy(() => import("./pages/Explore").catch(() => ({ default: () => <div>Error loading page</div> })));
const RoomView = lazy(() => import("./pages/RoomView").catch(() => ({ default: () => <div>Error loading page</div> })));
const PointShop = lazy(() => import("./pages/PointShop").catch(() => ({ default: () => <div>Error loading page</div> })));
const HowToUse = lazy(() => import("./pages/HowToUse").catch(() => ({ default: () => <div>Error loading page</div> })));
const ImageSearch = lazy(() => import("./pages/ImageSearch").catch(() => ({ default: () => <div>Error loading page</div> })));
const AiRooms = lazy(() => import("./pages/AiRooms").catch(() => ({ default: () => <div>Error loading page</div> })));
const InviteRedirect = lazy(() => import("./pages/InviteRedirect").catch(() => ({ default: () => <div>Error loading page</div> })));

const AiWorkDetail = lazy(() => import("./pages/AiWorkDetail").catch(() => ({ default: () => <div>Error loading page</div> })));
const Landing = lazy(() => import("./pages/Landing").catch(() => ({ default: () => <div>Error loading page</div> })));
const Privacy = lazy(() => import("./pages/Privacy").catch(() => ({ default: () => <div>Error loading page</div> })));
const Terms = lazy(() => import("./pages/Terms").catch(() => ({ default: () => <div>Error loading page</div> })));

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen bg-loading-bg flex items-center justify-center">
    <div className="space-y-6 text-center">
      <div className="relative">
        <div className="h-16 w-16 mx-auto">
          <Skeleton className="h-full w-full rounded-full" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-32 mx-auto" />
        <Skeleton className="h-4 w-24 mx-auto" />
      </div>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10分間はキャッシュを使用
      gcTime: 1000 * 60 * 60, // 1時間キャッシュを保持
      retry: 2, // 2回まで再試行
      refetchOnWindowFocus: false,
      refetchOnMount: false, // マウント時の再取得を防ぐ
      refetchOnReconnect: false, // ネット復帰時の再取得も抑制（必要時は明示的に invalidate）
      networkMode: 'online', // オンライン時のみクエリ実行
    },
    mutations: {
      retry: 1, // ミューテーションの再試行回数を制限
      networkMode: 'online',
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeColorProvider>
          <BrowserRouter>
            <AuthProvider>
              <OnboardingProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <RouteReadyTracker />
                  
                  <Suspense fallback={<LoadingFallback />}>
                    <Routes>
                      <Route path="/" element={<RootRedirect />} />
                      <Route path="/lp" element={<Landing />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/login" element={<Login />} />
                      {/* Public routes */}
                      <Route path="/user/:userId" element={<UserProfile />} />
                      <Route path="/explore" element={<Explore />} />
                      <Route path="/rooms/explore" element={<Navigate to="/explore?tab=rooms" replace />} />
                      <Route path="/room/:roomId" element={<RoomView />} />
                      <Route path="/ai-work/:id" element={<AiWorkDetail />} />
                      <Route path="/how-to-use" element={<HowToUse />} />
                      <Route path="/invite/:code" element={<InviteRedirect />} />
                      {/* Protected routes — require authentication */}
                      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                      <Route path="/add-item" element={<ProtectedRoute><AddItem /></ProtectedRoute>} />
                      <Route path="/quick-add" element={<ProtectedRoute><QuickAdd /></ProtectedRoute>} />
                      <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
                      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                      <Route path="/posts" element={<ProtectedRoute><Posts /></ProtectedRoute>} />
                      <Route path="/item-posts" element={<ProtectedRoute><ItemPostsFeed /></ProtectedRoute>} />
                      <Route path="/post/:postId" element={<ProtectedRoute><ItemPostsFeed /></ProtectedRoute>} />
                      <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
                      <Route path="/collection" element={<ProtectedRoute><Collection /></ProtectedRoute>} />
                      <Route path="/my-room" element={<ProtectedRoute><MyRoom /></ProtectedRoute>} />
                      <Route path="/image-search" element={<ProtectedRoute><ImageSearch /></ProtectedRoute>} />
                      <Route path="/ai-rooms" element={<ProtectedRoute><AiRooms /></ProtectedRoute>} />
                      <Route path="/matches" element={<Navigate to="/explore?tab=users" replace />} />
                      <Route path="/point-shop" element={<ProtectedRoute><PointShop /></ProtectedRoute>} />
                      <Route path="/points" element={<Navigate to="/point-shop" replace />} />
                      <Route path="*" element={<Navigate to="/my-room" replace />} />
                    </Routes>
                  </Suspense>
                </TooltipProvider>
              </OnboardingProvider>
            </AuthProvider>
          </BrowserRouter>
        </ThemeColorProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;
