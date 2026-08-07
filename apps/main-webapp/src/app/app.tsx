import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./shared/providers/ThemeProvider";
import { useAuthStore } from "@shared/stores/authStore";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import Login from "./pages/Auth/Login";
import VerifyOtp from "./pages/Auth/VerifyOTP";
import Credits from "./pages/Credits/Credits";
import MyStore from "./pages/MyStore/MyStore";
import MainLayout from "./pages/MainLayout/MainLayout";
import Profile from "./pages/Profile/Profile";
import Transactions from "./pages/Transactions/Transactions";
import TransactionsLeaderboard from "./pages/Transactions/TransactionsLeaderboard";
import TransactionsList from "./pages/Transactions/TransactionsList";
import Customers from "./pages/Customers/Customers";
import CustomerDetail from "./pages/Customers/CustomerDetail";
import Staff from "./pages/Staff/Staff";

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
            <Route path="/" element={<MyStore />} />
            <Route path="/credits" element={<Credits />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/transactions" element={<Transactions />}>
              <Route index element={<TransactionsList />} />
              <Route path="leaderboard" element={<TransactionsLeaderboard />} />
            </Route>
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:customerId" element={<CustomerDetail />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

export default App;