import AdminTabs from "@/components/AdminTabs";
import AdminClasses from "@/components/AdminClasses";
import AdminGuard from "@/components/AdminGuard";
export default function AdminClassesPage() {
  return <AdminGuard><><div className="pageHeading"><div className="eyebrow">ADMINISTRATION / CHAMPIONSHIP</div><h1>Manage Classes</h1><p className="muted">Add, rename, deactivate or delete the racing classes available to teams.</p></div><AdminTabs /><AdminClasses /></></AdminGuard>;
}
