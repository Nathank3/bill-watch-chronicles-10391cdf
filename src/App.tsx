
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { BillProvider } from "./contexts/BillContext";
import { DocumentProvider } from "./contexts/DocumentContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import HomePage from "./pages/HomePage";
import PublicPage from "./pages/PublicPage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import ClerkPage from "./pages/ClerkPage";
import CommitteePage from "./pages/CommitteePage";
import NotFound from "./pages/NotFound";

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
