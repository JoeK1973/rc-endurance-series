import AdminTabs from "@/components/AdminTabs";

export default function ManageTeamsPage() {
  return (
    <>
      <h1>Admin</h1>
      <p className="muted">Manage teams in the RC Endurance Series.</p>
      <AdminTabs />

      <div className="card">
        <h2>Manage Teams</h2>
        <p className="muted">
          Team administration is available here. Team managers create and
          manage their teams from Team Area.
        </p>
      </div>
    </>
  );
}
