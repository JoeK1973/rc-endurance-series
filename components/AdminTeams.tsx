"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/firebase/client";

type Team = { id: string; name: string; manager_id: string; club?: string | null; created_at?: string };
type Profile = { id: string; name?: string | null; email?: string | null; role?: string };

export default function AdminTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const client = createClient();
    const [{ data: teamRows, error: teamError }, { data: profileRows, error: profileError }] = await Promise.all([
      client.from("teams").select("*").order("name"),
      client.from("profiles").select("id,name,email,role"),
    ]);
    if (teamError || profileError) {
      setError(teamError?.message || profileError?.message || "Could not load approved teams.");
      setLoading(false);
      return;
    }
    const map: Record<string, Profile> = {};
    (profileRows || []).forEach((profile: Profile) => { map[profile.id] = profile; });
    setTeams((teamRows || []) as Team[]);
    setProfiles(map);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function perform(action: "rename" | "delete", team: Team, name?: string) {
    setBusyId(team.id);
    setError("");
    setNotice("");
    try {
      const client = createClient();
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error("Please sign in again.");
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, teamId: team.id, ...(name ? { name } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The operation failed.");
      if (action === "rename") {
        setTeams((current) => current.map((item) => item.id === team.id ? { ...item, name: result.name } : item));
        setEditingId(null);
        setNotice(`Team renamed to ${result.name}.`);
      } else {
        setTeams((current) => current.filter((item) => item.id !== team.id));
        setNotice(`${team.name} has been deleted. The team manager's role has been reverted to Driver where applicable.`);
      }
    } catch (err: any) {
      setError(err?.message || "The operation failed.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div className="card">Loading approved teams...</div>;

  return (
    <section className="card space">
      <h2>Manage Teams</h2>
      <p className="muted">Approved teams currently registered in the championship. You can rename or permanently delete a team.</p>
      {error && <div className="notice">{error}</div>}
      {notice && <div className="notice">{notice}</div>}
      {teams.length === 0 ? <p className="muted">There are no approved teams.</p> : (
        <div className="space">
          {teams.map((team) => {
            const manager = profiles[team.manager_id];
            const editing = editingId === team.id;
            const busy = busyId === team.id;
            return (
              <div key={team.id} className="card space">
                <div className="actionRow" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    {editing ? (
                      <div className="actionRow">
                        <input className="input" aria-label="Team name" value={editName} maxLength={80} onChange={(e) => setEditName(e.target.value)} />
                        <button className="btn" disabled={busy || !editName.trim()} onClick={() => void perform("rename", team, editName.trim())}>Save name</button>
                        <button className="btn secondary" disabled={busy} onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    ) : <h3>{team.name}</h3>}
                    {team.club && <p className="muted">Club: {team.club}</p>}
                    <p className="muted">Team manager: {manager?.name || manager?.email || team.manager_id}{manager?.email && manager?.name ? ` · ${manager.email}` : ""}</p>
                    <p className="muted">Manager role: {manager?.role || "unknown"}</p>
                  </div>
                  {!editing && <div className="actionRow">
                    <button className="btn secondary" disabled={busy} onClick={() => { setEditingId(team.id); setEditName(team.name); }}>Edit name</button>
                    <button className="btn danger" disabled={busy} onClick={() => {
                      const confirmed = window.confirm(`Permanently delete ${team.name}? This will remove its team memberships, invitations, shortlist entries and conversations/messages. Historical round payment registrations will be retained. The team manager will revert to Driver if they are currently a Team Manager.`);
                      if (confirmed) void perform("delete", team);
                    }}>{busy ? "Working..." : "Delete team"}</button>
                  </div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <button className="btn secondary" onClick={() => void load()}>Refresh teams</button>
    </section>
  );
}
