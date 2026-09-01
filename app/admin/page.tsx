import AdminRounds from "@/components/AdminRounds";
import AdminTabs from "@/components/AdminTabs";

export default function AdminPage() {
  return (
    <>
      <h1>Admin</h1>
      <p className="muted">Manage the RC Endurance Series.</p>
      <AdminTabs />
      <AdminRounds />
    </>
  );
}
