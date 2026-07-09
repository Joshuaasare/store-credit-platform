import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./shared/providers/theme-provider";
import { useAuthStore } from "./stores/auth-store";
import ProtectedRoute from "./components/protected-route";
import LoginPage from "./pages/auth/login-page";
import VerifyOtpPage from "./pages/auth/verify-otp-page";
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
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <DashboardPage /> : <LoginPage />;
}

export default App;
