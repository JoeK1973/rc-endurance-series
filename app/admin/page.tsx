import AdminRounds from "@/components/AdminRounds";
import AdminTabs from "@/components/AdminTabs";
import AdminGuard from "@/components/AdminGuard";

export default function AdminPage() {
  return (
    <AdminGuard>
      <>
      <h1>Admin</h1>
      <p className="muted">Manage the RC Endurance Series.</p>
      <AdminTabs />
      <AdminRounds />
      </>
    </AdminGuard>
  );
}
