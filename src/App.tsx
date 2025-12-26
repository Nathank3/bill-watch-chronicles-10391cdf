
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster.tsx";
import { Toaster as Sonner } from "@/components/ui/sonner.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { BillProvider } from "./contexts/BillContext.tsx";
import { DocumentProvider } from "./contexts/DocumentContext.tsx";
import { NotificationProvider } from "./contexts/NotificationContext.tsx";

const HomePage = lazy(() => import("./pages/HomePage.tsx"));
const PublicPage = lazy(() => import("./pages/PublicPage.tsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.tsx"));
const AdminPage = lazy(() => import("./pages/AdminPage.tsx"));
const ClerkPage = lazy(() => import("./pages/ClerkPage.tsx"));
const CommitteePage = lazy(() => import("./pages/CommitteePage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <BillProvider>
              <DocumentProvider>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/committee/:committeeId" element={<CommitteePage />} />
                    <Route path="/documents" element={<PublicPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/clerk" element={<ClerkPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </DocumentProvider>
            </BillProvider>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
