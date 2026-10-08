import AdminGuard from "@/components/AdminGuard";
import AdminTabs from "@/components/AdminTabs";
import AdminSettings from "@/components/AdminSettings";

export default function AdminSettingsPage() {
  return (
    <AdminGuard>
      <>
        <h1>Admin</h1>
        <p className="muted">Application settings.</p>
        <AdminTabs />
        <AdminSettings />
      </>
    </AdminGuard>
  );
}
