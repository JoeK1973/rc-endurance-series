"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase/client";

type Application = {
  id: string;
  applicant_id: string;
  applicant_name?: string;
  applicant_email?: string;
  team_name: string;
  club?: string;
  reason?: string;
  status: string;
  admin_note?: string;
  created_at?: string | null;
};

export default function AdminTeamApplications() {
  const [rows, setRows] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("pending");

  const getToken = useCallback(async () => {
    await auth.authStateReady();
    if (!auth.currentUser) throw new Error("Please sign in again.");
    return auth.currentUser.getIdToken();
  }, []);

  const load = useCallback(async () => {
    const token = await getToken();
    const response = await fetch("/api/admin/team-applications", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load team applications.");
    setRows(data.applications || []);
  }, [getToken]);

  useEffect(() => {
    load().catch((error) => setMessage(error.message)).finally(() => setLoading(false));
  }, [load]);

  const visible = useMemo(
    () => rows.filter((row) => filter === "all" || row.status === filter),
    [rows, filter],
  );

  async function review(row: Application, action: "approve" | "reject") {
    const prompt = action === "approve"
      ? `Approve ${row.team_name} and make ${row.applicant_name || row.applicant_email || "the applicant"} its team manager?`
      : `Reject the application for ${row.team_name}?`;
    if (!window.confirm(prompt)) return;

    try {
      setBusy(row.id);
      setMessage("");
      const token = await getToken();
      const response = await fetch("/api/admin/team-applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ applicationId: row.id, action, adminNote: note[row.id] || "" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not review application.");
      setMessage(action === "approve"
        ? `${row.team_name} approved. The applicant is now a team manager.`
        : `${row.team_name} application rejected.`);
      await load();
    } catch (error: any) {
      setMessage(error?.message || "Could not review application.");
    } finally {
      setBusy("");
    }
  }

  if (loading) return <div className="card">Loading team applications...</div>;

  return (
    <section className="card space">
      <h2>Team Applications</h2>
      <p className="muted">Review applications from drivers who want to register a team. Approval creates the team and promotes the applicant to Team Manager.</p>

      <label>
        Show
        <select className="input" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="pending">Awaiting review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All applications</option>
        </select>
      </label>

      {message && <div className="notice" role="status">{message}</div>}
      {!visible.length ? <p className="muted">No applications in this category.</p> : visible.map((row) => (
        <article className="card space" key={row.id}>
          <div className="actionRow" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3>{row.team_name}</h3>
              <p className="muted">Applicant: {row.applicant_name || "Name not supplied"}{row.applicant_email ? ` · ${row.applicant_email}` : ""}</p>
              {row.club && <p className="muted">Club: {row.club}</p>}
              {row.created_at && <p className="muted">Submitted: {new Date(row.created_at).toLocaleString("en-GB")}</p>}
            </div>
            <strong>{row.status.replaceAll("_", " ")}</strong>
          </div>
          {row.reason && <p>{row.reason}</p>}
          {row.admin_note && <p className="muted">Admin note: {row.admin_note}</p>}
          {row.status === "pending" && <>
            <label>
              Organiser's note (optional)
              <textarea className="input" rows={2} maxLength={500} value={note[row.id] || ""} onChange={(event) => setNote((current) => ({ ...current, [row.id]: event.target.value }))} />
            </label>
            <div className="actionRow">
              <button className="btn" disabled={!!busy} onClick={() => void review(row, "approve")}>{busy === row.id ? "Working..." : "Approve application"}</button>
              <button className="btn danger" disabled={!!busy} onClick={() => void review(row, "reject")}>Reject application</button>
            </div>
          </>}
        </article>
      ))}
      <button className="btn secondary" disabled={!!busy} onClick={() => {
        setLoading(true);
        load().catch((error) => setMessage(error.message)).finally(() => setLoading(false));
      }}>Refresh applications</button>
    </section>
  );
}
