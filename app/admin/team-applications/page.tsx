import AdminTabs from "@/components/AdminTabs";
import AdminTeamApplications from "@/components/AdminTeamApplications";

export default function TeamApplicationsPage() {
  return (
    <>
      <h1>Admin</h1>
      <p className="muted">Review applications to register new teams.</p>
      <AdminTabs />
      <AdminTeamApplications />
    </>
  );
}
