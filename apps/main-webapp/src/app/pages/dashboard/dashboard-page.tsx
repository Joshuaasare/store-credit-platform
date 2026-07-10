import { useAuthStore } from "@shared/stores/authStore";
import { Button } from "@store-credit-platform/web-components";

export default function DashboardPage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Welcome, {user?.surname}</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>Email:</strong> {user?.email}
            </p>
            <p>
              <strong>Phone:</strong> {user?.phone}
            </p>
            <p>
              <strong>Roles:</strong>{" "}
              {user?.roles.map((r) => r.role).join(", ") || "None"}
            </p>
            <p>
              <strong>Access:</strong>{" "}
              {user?.access_granted ? "Granted" : "Denied"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
