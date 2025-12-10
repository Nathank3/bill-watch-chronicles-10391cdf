
import { Toaster } from "@/components/ui/toaster.tsx";
import { Toaster as Sonner } from "@/components/ui/sonner.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { BillProvider } from "./contexts/BillContext.tsx";
import { DocumentProvider } from "./contexts/DocumentContext.tsx";
import { NotificationProvider } from "./contexts/NotificationContext.tsx";
import HomePage from "./pages/HomePage.tsx";
import PublicPage from "./pages/PublicPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import AdminPage from "./pages/AdminPage.tsx";
import ClerkPage from "./pages/ClerkPage.tsx";
import CommitteePage from "./pages/CommitteePage.tsx";
import NotFound from "./pages/NotFound.tsx";

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
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/committee/:committeeId" element={<CommitteePage />} />
                  <Route path="/documents" element={<PublicPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/clerk" element={<ClerkPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </DocumentProvider>
            </BillProvider>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
