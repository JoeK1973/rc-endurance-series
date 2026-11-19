import AdminRegistrations from "@/components/AdminRegistrations";
import AdminTabs from "@/components/AdminTabs";

export default function AdminRegistrationsPage() {
  return (
    <>
      <div className="pageHeading">
        <div className="eyebrow">ADMINISTRATION / OPERATIONS</div>
        <h1>Manage Registrations</h1>
        <p className="muted">Manage team entries and payments.</p>
      </div>
      <AdminTabs />
      <AdminRegistrations />
    </>
  );
}
