import AdminTabs from "@/components/AdminTabs";
import AdminTeamApplications from "@/components/AdminTeamApplications";

export default function TeamApplicationsPage() {
  return (
    <>
      <div className="pageHeading">
        <div className="eyebrow">ADMINISTRATION / PEOPLE &amp; TEAMS</div>
        <h1>Team Applications</h1>
        <p className="muted">Review applications to register new teams.</p>
      </div>
      <AdminTabs />
      <AdminTeamApplications />
    </>
  );
}
