import AdminGuard from "@/components/AdminGuard";
import AdminTabs from "@/components/AdminTabs";
import AdminSettings from "@/components/AdminSettings";

export default function AdminSettingsPage() {
  return (
    <AdminGuard>
      <>
        <div className="pageHeading">
          <div className="eyebrow">ADMINISTRATION / SYSTEM</div>
          <h1>Settings</h1>
          <p className="muted">Application settings.</p>
        </div>
        <AdminTabs />
        <AdminSettings />
      </>
    </AdminGuard>
  );
}
