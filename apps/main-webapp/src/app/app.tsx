import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./shared/providers/theme-provider";
import { useAuthStore } from "@shared/stores/authStore";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import Login from "./pages/Auth/Login";
import VerifyOtp from "./pages/Auth/VerifyOTP";
import Credits from "./pages/Credits/Credits";
import Dashboard from "./pages/Dashboard/Dashboard";
import MainLayout from "./pages/MainLayout/MainLayout";
import Profile from "./pages/Profile/Profile";

export function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ThemeProvider defaultTheme="light">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/credits" element={<Credits />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/" element={<NavigateToDashboard />} />
          </Route>
        </Route>
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

  return isAuthenticated ? <Dashboard /> : <Login />;
}

export default App;
