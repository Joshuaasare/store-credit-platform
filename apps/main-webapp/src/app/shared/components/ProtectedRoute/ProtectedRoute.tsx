import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@shared/stores/authStore";

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="text-muted-foreground mt-4 text-sm">
            Verifying authentication...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login but save the location they were trying to visit
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
