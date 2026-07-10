import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./shared/providers/theme-provider";
import { useAuthStore } from "@shared/stores/authStore";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import LoginPage from "./pages/auth/Login";
import VerifyOtpPage from "./pages/auth/VerifyOTP";
import DashboardPage from "./pages/dashboard/dashboard-page";

export function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ThemeProvider defaultTheme="light">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<NavigateToDashboard />} />
      </Routes>
    </ThemeProvider>
  );
}

function NavigateToDashboard() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return isAuthenticated ? <DashboardPage /> : <LoginPage />;
}

export default App;
