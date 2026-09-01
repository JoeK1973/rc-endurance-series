import Link from "next/link";
import AdminRounds from "@/components/AdminRounds";
export default function AdminPage(){
 return <><h1>Admin</h1><p className="muted">Manage the RC Endurance Series.</p>
 <div className="tabs"><Link href="/admin">Manage Rounds</Link><Link href="/admin/drivers">Manage Drivers</Link><Link href="/admin/teams">Manage Teams</Link></div>
 <AdminRounds/>
 </>;
}