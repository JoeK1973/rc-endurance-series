import AdminTabs from "@/components/AdminTabs";
import AdminGuard from "@/components/AdminGuard";

export default function ManageDriversPage() {
  return (
    <AdminGuard>
      <>
      <h1>Admin</h1>
      <p className="muted">Manage drivers registered for the RC Endurance Series.</p>
      <AdminTabs />

      <div className="card">
        <h2>Manage Drivers</h2>
        <p className="muted">
          Driver administration is available here. Drivers register themselves
          and can manage their availability from Driver Area.
        </p>
      </div>
      </>
    </AdminGuard>
  );
}
