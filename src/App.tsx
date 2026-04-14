
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

// Import main pages directly for faster navigation
import Search from "./pages/Search";
import Collection from "./pages/Collection";
import Posts from "./pages/Posts";
import MyRoom from "./pages/MyRoom";

// Lazy load only rarely used pages
const Login = lazy(() => import("./pages/Login").catch(() => ({ default: () => <div>Error loading page</div> })));
const Admin = lazy(() => import("./pages/Admin").catch(() => ({ default: () => <div>Error loading page</div> })));
const AddItem = lazy(() => import("./pages/AddItem").catch(() => ({ default: () => <div>Error loading page</div> })));
const QuickAdd = lazy(() => import("./pages/QuickAdd").catch(() => ({ default: () => <div>Error loading page</div> })));
const UserProfile = lazy(() => import("./pages/UserProfile").catch(() => ({ default: () => <div>Error loading page</div> })));
const EditProfile = lazy(() => import("./pages/EditProfile").catch(() => ({ default: () => <div>Error loading page</div> })));
const Messages = lazy(() => import("./pages/Messages").catch(() => ({ default: () => <div>Error loading page</div> })));
const RoomExplore = lazy(() => import("./pages/RoomExplore").catch(() => ({ default: () => <div>Error loading page</div> })));
const RoomView = lazy(() => import("./pages/RoomView").catch(() => ({ default: () => <div>Error loading page</div> })));
// const PointShop = lazy(() => import("./pages/PointShop")); // サブスク移行予定のため一旦非表示
const HowToUse = lazy(() => import("./pages/HowToUse").catch(() => ({ default: () => <div>Error loading page</div> })));
const ImageSearch = lazy(() => import("./pages/ImageSearch").catch(() => ({ default: () => <div>Error loading page</div> })));

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
      refetchOnReconnect: true, // ネットワーク再接続時は再取得
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
                  <Suspense fallback={<LoadingFallback />}>
                    <Routes>
                      <Route path="/" element={<Navigate to="/my-room" replace />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="/add-item" element={<AddItem />} />
                      <Route path="/quick-add" element={<QuickAdd />} />
                      <Route path="/user/:userId" element={<UserProfile />} />
                      <Route path="/edit-profile" element={<EditProfile />} />
                      <Route path="/messages" element={<Messages />} />
                      <Route path="/posts" element={<Posts />} />
                      <Route path="/search" element={<Search />} />
                      <Route path="/collection" element={<Collection />} />
                      <Route path="/my-room" element={<MyRoom />} />
                      <Route path="/rooms/explore" element={<RoomExplore />} />
                      <Route path="/room/:roomId" element={<RoomView />} />
                      {/* ポイントショップは一旦非表示（サブスク移行予定） */}
                      <Route path="/how-to-use" element={<HowToUse />} />
                      <Route path="/image-search" element={<ImageSearch />} />
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
