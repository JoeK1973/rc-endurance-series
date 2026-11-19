import AdminTabs from "@/components/AdminTabs";

export default function ManageDriversPage() {
  return (
    <>
      <div className="pageHeading">
        <div className="eyebrow">ADMINISTRATION / PEOPLE &amp; TEAMS</div>
        <h1>Manage Drivers</h1>
        <p className="muted">Manage drivers registered for the RC Endurance Series.</p>
      </div>
      <AdminTabs />

      <div className="card">
        <h2>Manage Drivers</h2>
        <p className="muted">
          Driver administration is available here. Drivers register themselves
          and can manage their availability from Driver Area.
        </p>
      </div>
    </>
  );
}
