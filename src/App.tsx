
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load pages with error boundaries
const Index = lazy(() => import("./pages/Index").catch(() => ({ default: () => <div>Error loading page</div> })));
const Login = lazy(() => import("./pages/Login").catch(() => ({ default: () => <div>Error loading page</div> })));
const Admin = lazy(() => import("./pages/Admin").catch(() => ({ default: () => <div>Error loading page</div> })));
const AddItem = lazy(() => import("./pages/AddItem").catch(() => ({ default: () => <div>Error loading page</div> })));
const UserProfile = lazy(() => import("./pages/UserProfile").catch(() => ({ default: () => <div>Error loading page</div> })));
const EditProfile = lazy(() => import("./pages/EditProfile").catch(() => ({ default: () => <div>Error loading page</div> })));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="space-y-4">
      <Skeleton className="h-12 w-48" />
      <Skeleton className="h-4 w-32" />
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <LanguageProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/add-item" element={<AddItem />} />
                    <Route path="/user/:userId" element={<UserProfile />} />
                    <Route path="/edit-profile" element={<EditProfile />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </TooltipProvider>
            </LanguageProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

export default App;
