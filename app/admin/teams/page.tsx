"use client";

import { useEffect, useState } from "react";
import AdminTabs from "@/components/AdminTabs";
import AdminGuard from "@/components/AdminGuard";
import { createClient } from "@/lib/firebase/client";

type Application = {
  id: string;
  applicant_id: string;
  applicant_name: string | null;
  applicant_email: string | null;
  team_name: string;
  club: string | null;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string | null;
  created_at?: string;
};

export default function ManageTeamsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});
  const [teams, setTeams] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    const s = createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }
    const [{ data, error }, { data: teamData, error: teamError }] = await Promise.all([
      s.from("team_applications").select("*").order("created_at", { ascending: false }),
      s.from("teams").select("id,name,club,manager_id,application_id").order("name"),
    ]);

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (teamError) {
      setMessage(teamError.message);
      setLoading(false);
      return;
    }

    setApplications((data || []) as Application[]);

    const teamsWithManagers = await Promise.all(
      (teamData || []).map(async (team: any) => {
        const { data: managerProfile } = await s
          .from("profiles")
          .select("id,name,email")
          .eq("id", team.manager_id)
          .maybeSingle();

        return {
          ...team,
          manager_name: managerProfile?.name || null,
          manager_email: managerProfile?.email || null,
        };
      })
    );

    setTeams(teamsWithManagers);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function approve(application: Application) {
    setBusy(application.id); setMessage("");
    const s = createClient();
    const { error } = await s.admin.approveTeamApplication(application);
    if (error) setMessage(error.message);
    else setMessage(`${application.team_name} has been approved and ${application.applicant_name || application.applicant_email || "the applicant"} is now a team manager.`);
    setBusy(null);
    await load();
  }

  async function reject(application: Application) {
    setBusy(application.id); setMessage("");
    const s = createClient();
    const { data: { user } } = await s.auth.getUser();
    const { error } = await s.from("team_applications").update({
      status: "rejected",
      reviewed_by: user?.id || "",
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectionReason[application.id]?.trim() || null,
    }).eq("id", application.id);
    if (error) setMessage(error.message);
    else setMessage(`${application.team_name} has been rejected.`);
    setBusy(null);
    await load();
  }

  const pending = applications.filter((a) => a.status === "pending");
  const reviewed = applications.filter((a) => a.status !== "pending");

  return (
    <AdminGuard>
      <>
      <h1>Admin</h1>
      <p className="muted">Review team registration applications.</p>
      <AdminTabs />

      {message && <div className="notice space">{message}</div>}

      <div className="card space">
        <h2>Pending team applications</h2>
        {loading ? <p className="muted">Loading...</p> : !pending.length ? <p className="muted">There are no pending team applications.</p> : (
          <div className="space">
            {pending.map((application) => (
              <div className="card" key={application.id}>
                <h3>{application.team_name}</h3>
                <p><b>Club:</b> {application.club || "Not specified"}</p>
                <p><b>Applicant:</b> {application.applicant_name || "Not specified"}</p>
                <p><b>Email:</b> {application.applicant_email || "Not specified"}</p>
                <p><b>About:</b> {application.reason || "Not provided"}</p>
                <div className="actionRow">
                  <button className="btn" disabled={busy === application.id} onClick={() => void approve(application)}>
                    {busy === application.id ? "Processing..." : "Approve"}
                  </button>
                  <input className="input" placeholder="Optional rejection reason" value={rejectionReason[application.id] || ""} onChange={(e) => setRejectionReason((current) => ({ ...current, [application.id]: e.target.value }))} />
                  <button className="btn danger" disabled={busy === application.id} onClick={() => void reject(application)}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card space">
        <h2>Approved teams</h2>
        {!teams.length ? <p className="muted">No approved teams have been registered yet.</p> : teams.map((team) => {
          const application = applications.find((item) => item.id === team.application_id);
          return (
            <div className="roundRow" key={team.id}>
              <div>
                <b>{team.name}</b><br />
                <span className="muted">Club: {team.club || "Not specified"}</span>
              </div>
              <span className="muted">
                Manager: {
                  team.manager_name ||
                  application?.applicant_name ||
                  application?.applicant_email ||
                  team.manager_email ||
                  team.manager_id
                }
              </span>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2>Previous applications</h2>
        {!reviewed.length ? <p className="muted">No reviewed applications yet.</p> : reviewed.map((application) => (
          <div className="roundRow" key={application.id}>
            <div><b>{application.team_name}</b><br /><span className="muted">{application.club || "No club"} · {application.status}</span></div>
            <span className="muted">{application.applicant_name || application.applicant_email}</span>
          </div>
        ))}
      </div>
      </>
    </AdminGuard>
  );
}
