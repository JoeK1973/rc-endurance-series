import AdminGuard from "@/components/AdminGuard";
import AdminTabs from "@/components/AdminTabs";
import AdminRegulations from "@/components/AdminRegulations";

export default function AdminRegulationsPage() {
  return (
    <AdminGuard>
      <>
        <h1>Admin</h1>
        <p className="muted">Manage championship rules and regulations.</p>
        <AdminTabs />
        <AdminRegulations />
      </>
    </AdminGuard>
  );
}
