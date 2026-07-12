import { useAuthStore } from "@shared/stores/authStore";

export default function ProfilePage() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <div className="mt-4 space-y-2 text-sm text-gray-600">
          <p>
            <strong>Name:</strong> {user?.surname}
          </p>
          <p>
            <strong>Email:</strong> {user?.email}
          </p>
          <p>
            <strong>Phone:</strong> {user?.phone}
          </p>
        </div>
      </div>
    </div>
  );
}
