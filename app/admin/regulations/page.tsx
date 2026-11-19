import AdminGuard from "@/components/AdminGuard";
import AdminTabs from "@/components/AdminTabs";
import AdminRegulations from "@/components/AdminRegulations";

export default function AdminRegulationsPage() {
  return (
    <AdminGuard>
      <>
        <div className="pageHeading">
          <div className="eyebrow">ADMINISTRATION / CHAMPIONSHIP</div>
          <h1>Manage Regulations</h1>
          <p className="muted">Manage championship rules and regulations.</p>
        </div>
        <AdminTabs />
        <AdminRegulations />
      </>
    </AdminGuard>
  );
}
