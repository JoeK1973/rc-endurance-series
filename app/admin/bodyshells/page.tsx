import AdminGuard from "@/components/AdminGuard";
import AdminTabs from "@/components/AdminTabs";
import AdminBodyshells from "@/components/AdminBodyshells";

export default function AdminBodyshellsPage() {
  return (
    <AdminGuard>
      <>
        <h1>Admin</h1>
        <p className="muted">Review and approve team bodyshell submissions.</p>
        <AdminTabs />
        <AdminBodyshells />
      </>
    </AdminGuard>
  );
}
