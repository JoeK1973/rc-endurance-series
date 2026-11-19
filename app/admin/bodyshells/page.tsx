import AdminGuard from "@/components/AdminGuard";
import AdminTabs from "@/components/AdminTabs";
import AdminBodyshells from "@/components/AdminBodyshells";

export default function AdminBodyshellsPage() {
  return (
    <AdminGuard>
      <>
        <div className="pageHeading">
          <div className="eyebrow">ADMINISTRATION / PEOPLE &amp; TEAMS</div>
          <h1>Bodyshell Approvals</h1>
          <p className="muted">Review and approve team bodyshell submissions.</p>
        </div>
        <AdminTabs />
        <AdminBodyshells />
      </>
    </AdminGuard>
  );
}
