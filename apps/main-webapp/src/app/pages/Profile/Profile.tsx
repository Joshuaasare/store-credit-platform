import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button, Card } from "@store-credit-platform/web-components";
import { useAuthStore } from "@shared/stores/authStore";
import { PageHeader } from "@shared/components/PageHeader";

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader title="Profile" subtitle="Your account details and access.">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </PageHeader>

        <Card className="p-6">
          <div className="space-y-2 text-sm">
            <Row label="Surname" value={user?.surname ?? "—"} />
            <Row label="Other names" value={user?.other_names ?? "—"} />
            <Row label="Email" value={user?.email ?? "—"} />
            <Row label="Phone" value={user?.phone ?? "—"} />
            <Row label="Roles" value={user?.role ?? "None"} />
            <Row
              label="Access"
              value={user?.access_granted ? "Granted" : "Denied"}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
