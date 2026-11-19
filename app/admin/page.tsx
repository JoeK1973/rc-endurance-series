import AdminDashboard from "@/components/AdminDashboard";
import AdminGuard from "@/components/AdminGuard";

export default function AdminPage() {
  return (
    <AdminGuard>
      <>
        <div className="pageHeading">
          <div className="eyebrow">RC ENDURANCE SERIES</div>
          <h1>Admin Dashboard</h1>
          <p className="muted">Your central hub for managing the championship.</p>
        </div>
        <AdminDashboard />
      </>
    </AdminGuard>
  );
}
