
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster.tsx";
import { Toaster as Sonner } from "@/components/ui/sonner.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { BillProvider } from "./contexts/BillContext.tsx";
import { DocumentProvider } from "./contexts/DocumentContext.tsx";
import { NotificationProvider } from "./contexts/NotificationContext.tsx";
import { LoadingScreen } from "./components/LoadingScreen.tsx";

// Lazy load pages
const HomePage = lazy(() => import("./pages/HomePage.tsx"));
const PublicPage = lazy(() => import("./pages/PublicPage.tsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.tsx"));
const CommitteePage = lazy(() => import("./pages/CommitteePage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Dashboard Layout & Pages
const DashboardLayout = lazy(() => import("./layouts/DashboardLayout.tsx"));
const Overview = lazy(() => import("./pages/dashboard/Overview.tsx"));
const BusinessView = lazy(() => import("./pages/dashboard/BusinessView.tsx"));
const AddBusinessView = lazy(() => import("./pages/dashboard/AddBusinessView.tsx"));
const ReviewBusinessView = lazy(() => import("./pages/dashboard/ReviewBusinessView.tsx"));
const DataControlView = lazy(() => import("./pages/dashboard/DataControlView.tsx"));
const UserManagementView = lazy(() => import("./pages/dashboard/UserManagementView.tsx"));
const CommitteeManagementView = lazy(() => import("./pages/dashboard/CommitteeManagementView.tsx"));
const AnalyticsView = lazy(() => import("./pages/dashboard/AnalyticsView.tsx"));
const SystemAuditView = lazy(() => import("./pages/dashboard/SystemAuditView.tsx"));

const PageLoader = () => <LoadingScreen />;

const queryClient = new QueryClient();

import { SystemGuard } from "@/components/SystemGuard.tsx";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SystemGuard>
          <AuthProvider>
          <NotificationProvider>
            <BillProvider>
              <DocumentProvider>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/committee/:committeeId" element={<CommitteePage />} />
                    <Route path="/documents" element={<PublicPage />} />
                    <Route path="/login" element={<LoginPage />} />

                    {/* Dashboard Routes */}
                    <Route path="/dashboard" element={<DashboardLayout />}>
                        <Route index element={<Overview />} />
                        <Route path="overview" element={<Overview />} />
                        <Route path="view/:type" element={<BusinessView />} />
                        <Route path="add/:type" element={<AddBusinessView />} />
                        <Route path="review" element={<ReviewBusinessView />} />
                        <Route path="data-control" element={<DataControlView />} />
                        <Route path="users" element={<UserManagementView />} />
                        <Route path="committees" element={<CommitteeManagementView />} />
                        <Route path="analytics" element={<AnalyticsView />} />
                        <Route path="audit" element={<SystemAuditView />} />
                    </Route>

                    {/* Legacy Redirects */}
                    <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/clerk" element={<Navigate to="/dashboard" replace />} />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </DocumentProvider>
            </BillProvider>
          </NotificationProvider>
        </AuthProvider>
      </SystemGuard>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
