import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { Dashboard } from "./pages/Dashboard";
import { SpendingAdd } from "./pages/SpendingAdd";
import { SpendingView } from "./pages/SpendingView";
import { BudgetManager } from "./pages/BudgetManager";
import { AnalysisHabits } from "./pages/AnalysisHabits";
import { AnalysisSuggestions } from "./pages/AnalysisSuggestions";
import { AnalysisTrends } from "./pages/AnalysisTrends";
import { History } from "./pages/History";
import { Settings } from "./pages/Settings";
import { Income } from "./pages/Income";

const queryClient = new QueryClient();

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/income" element={<ProtectedRoute><Income /></ProtectedRoute>} />
            <Route path="/spending/add" element={<ProtectedRoute><SpendingAdd /></ProtectedRoute>} />
            <Route path="/spending/view" element={<ProtectedRoute><SpendingView /></ProtectedRoute>} />
            <Route path="/budget" element={<ProtectedRoute><BudgetManager /></ProtectedRoute>} />
            <Route path="/analysis/habits" element={<ProtectedRoute><AnalysisHabits /></ProtectedRoute>} />
            <Route path="/analysis/suggestions" element={<ProtectedRoute><AnalysisSuggestions /></ProtectedRoute>} />
            <Route path="/analysis/trends" element={<ProtectedRoute><AnalysisTrends /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
