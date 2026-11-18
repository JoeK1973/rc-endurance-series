import AdminTabs from "@/components/AdminTabs";
import AdminTeams from "@/components/AdminTeams";

export default function ManageTeamsPage() {
  return (
    <>
      <h1>Admin</h1>
      <p className="muted">Manage approved teams in the RC Endurance Series.</p>
      <AdminTabs />
      <AdminTeams />
    </>
  );
}
