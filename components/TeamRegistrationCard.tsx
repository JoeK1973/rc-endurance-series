"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

type Application = {
  id: string;
  team_name: string;
  club?: string;
  reason?: string;
  status: string;
  admin_note?: string;
};

export default function TeamRegistrationCard() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState("driver");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [application, setApplication] = useState<Application | null>(null);
  const [teamName, setTeamName] = useState("");
  const [club, setClub] = useState("");
  const [reason, setReason] = useState("");

  async function loadForUser(firebaseUser: User | null) {
    setUser(firebaseUser);
    if (!firebaseUser) {
      setApplication(null);
      setRole("driver");
      setLoading(false);
      return;
    }

    try {
      await auth.authStateReady();
      const token = await firebaseUser.getIdToken();
      const response = await fetch("/api/team-applications", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load your team application.");
      setRole(result.role || "driver");
      setApplication(result.application || null);
      setMessage("");
    } catch (error: any) {
      setMessage(error?.message || "Could not load your team application.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setLoading(true);
      void loadForUser(firebaseUser);
    });
    return unsubscribe;
  }, []);

  async function submitApplication(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/team-applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teamName: teamName.trim(),
          club: club.trim(),
          reason: reason.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not submit your application.");
      setApplication(result.application);
      setTeamName("");
      setClub("");
      setReason("");
      setMessage("Your team registration application has been submitted for admin approval.");
    } catch (error: any) {
      setMessage(error?.message || "Could not submit your application.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="card">Loading team registration...</div>;

  if (!user) {
    return (
      <div className="card">
        <h2>Register a Team</h2>
        <p className="muted">Log in or create an account to apply to register an endurance team.</p>
        <div className="actionRow">
          <a className="btn" href="/login">Log in to apply</a>
          <a className="btn secondary" href="/register">Create an account</a>
        </div>
      </div>
    );
  }

  if (role === "team_manager" || role === "admin" || role === "superuser") {
    return (
      <div className="card">
        <h2>Team Area</h2>
        <p className="muted">Your account already has team-management permissions.</p>
        <a className="btn" href="/teams">Open Team Area</a>
      </div>
    );
  }

  if (application?.status === "pending") {
    return (
      <div className="card">
        <h2>Team Registration</h2>
        <p>Your application for <b>{application.team_name}</b> is awaiting admin approval.</p>
        {application.club && <p className="muted">Club: {application.club}</p>}
        {message && <p className="notice">{message}</p>}
      </div>
    );
  }

  if (application?.status === "approved") {
    return (
      <div className="card">
        <h2>Team Registration Approved</h2>
        <p>Your application for <b>{application.team_name}</b> has been approved.</p>
        <a className="btn" href="/teams">Open Team Area</a>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Register a Team</h2>
      {application?.status === "rejected" && (
        <p className="notice">
          Your previous application was not approved.
          {application.admin_note ? ` Organiser's note: ${application.admin_note}` : ""}
          {" "}You can submit a new application below.
        </p>
      )}
      <p className="muted">Apply to register a team in the RC Endurance Series. An admin will review your application.</p>

      <form onSubmit={submitApplication} className="space">
        <label>
          Team name
          <input className="input" required maxLength={80} value={teamName} onChange={(e) => setTeamName(e.target.value)} />
        </label>

        <label>
          Club
          <input className="input" maxLength={100} value={club} onChange={(e) => setClub(e.target.value)} />
        </label>

        <label>
          About the team
          <textarea className="input" rows={4} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Tell the organiser about your team." />
        </label>

        <button className="btn" disabled={saving}>
          {saving ? "Submitting..." : "Submit team application"}
        </button>

        {message && <p className="notice" role="status">{message}</p>}
      </form>
    </div>
  );
}
