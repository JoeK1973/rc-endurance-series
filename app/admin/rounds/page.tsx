import AdminRounds from "@/components/AdminRounds";
import AdminTabs from "@/components/AdminTabs";
import AdminGuard from "@/components/AdminGuard";

export default function AdminRoundsPage() {
  return (
    <AdminGuard>
      <>
        <div className="pageHeading">
          <div className="eyebrow">ADMINISTRATION / CHAMPIONSHIP</div>
          <h1>Manage Rounds</h1>
          <p className="muted">Create and manage championship rounds, venues and registration settings.</p>
        </div>
        <AdminTabs />
        <AdminRounds />
      </>
    </AdminGuard>
  );
}
