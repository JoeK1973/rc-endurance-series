"use client";

import { useEffect, useMemo, useState } from "react";
import AdminTabs from "@/components/AdminTabs";
import AdminGuard from "@/components/AdminGuard";
import { createClient } from "@/lib/firebase/client";

type Profile = { id: string; name?: string | null; email?: string | null; role?: string | null };

export default function ManageAdminsPage() {
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const s = createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }
    setCurrentUserId(user.id);
    const { data: me } = await s.from("profiles").select("role").eq("id", user.id).maybeSingle();
    setCurrentRole(me?.role || "driver");
    const { data } = await s.from("profiles").select("id,name,email,role");
    setProfiles((data || []) as Profile[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const admins = profiles.filter((p) => p.role === "admin" || p.role === "superuser");
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return profiles.filter((p) => {
      if (!q) return true;
      return `${p.name || ""} ${p.email || ""}`.toLowerCase().includes(q);
    });
  }, [profiles, search]);

  async function setRole(profile: Profile, role: string) {
    if (currentRole !== "superuser") return;
    if (profile.id === currentUserId && role !== "superuser") {
      setMessage("The superuser account cannot remove its own superuser permission.");
      return;
    }
    const s = createClient();
    const { error } = await s.from("profiles").update({ role }).eq("id", profile.id);
    setMessage(error ? error.message : `${profile.email || profile.name || "User"} is now ${role}.`);
    await load();
  }

  async function promoteByEmail(e: React.FormEvent) {
    e.preventDefault();
    const target = profiles.find((p) => (p.email || "").toLowerCase() === email.trim().toLowerCase());
    if (!target) { setMessage("No registered user was found with that email address."); return; }
    await setRole(target, "admin");
    setEmail("");
  }

  const canManage = currentRole === "superuser";

  return (
    <AdminGuard>
      <>
      <h1>Admin</h1>
      <p className="muted">Manage administrator permissions.</p>
      <AdminTabs />

      {!canManage && <div className="notice space">Only the superuser can create or manage administrators.</div>}

      <div className="card space">
        <h2>Administrators</h2>
        {loading ? <p className="muted">Loading...</p> : admins.map((admin) => (
          <div className="roundRow" key={admin.id}>
            <div><b>{admin.name || "Unnamed user"}</b><br /><span className="muted">{admin.email || admin.id}</span></div>
            <div className="actionRow">
              <span>{admin.role}</span>
              {canManage && admin.role === "admin" && <button className="btn danger small" onClick={() => void setRole(admin, "driver")}>Remove admin</button>}
            </div>
          </div>
        ))}
      </div>

      {canManage && <>
        <div className="card space">
          <h2>Make a user an admin</h2>
          <form className="actionRow" onSubmit={promoteByEmail}>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Existing user's email" />
            <button className="btn">Make admin</button>
          </form>
        </div>

        <div className="card">
          <h2>Registered users</h2>
          <input className="input space" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users" />
          {filteredUsers.map((profile) => (
            <div className="roundRow" key={profile.id}>
              <div><b>{profile.name || "Unnamed user"}</b><br /><span className="muted">{profile.email || profile.id}</span></div>
              <div className="actionRow">
                <span>{profile.role || "driver"}</span>
                {profile.role === "driver" && <button className="btn small" onClick={() => void setRole(profile, "admin")}>Make admin</button>}
                {profile.role === "admin" && <button className="btn danger small" onClick={() => void setRole(profile, "driver")}>Remove admin</button>}
              </div>
            </div>
          ))}
        </div>
      </>}

      {message && <div className="notice space">{message}</div>}
      </>
    </AdminGuard>
  );
}
