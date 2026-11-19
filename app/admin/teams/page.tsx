import AdminTabs from "@/components/AdminTabs";
import AdminTeams from "@/components/AdminTeams";

export default function ManageTeamsPage() {
  return (
    <>
      <div className="pageHeading">
        <div className="eyebrow">ADMINISTRATION / PEOPLE &amp; TEAMS</div>
        <h1>Manage Teams</h1>
        <p className="muted">Manage approved teams in the RC Endurance Series.</p>
      </div>
      <AdminTabs />
      <AdminTeams />
    </>
  );
}
