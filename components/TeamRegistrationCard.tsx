"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, createClient } from "@/lib/firebase/client";

export default function TeamRegistrationCard() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState("driver");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [application, setApplication] = useState<any | null>(null);
  const [teamName, setTeamName] = useState("");
  const [club, setClub] = useState("");
  const [reason, setReason] = useState("");

  async function loadForUser(firebaseUser: User | null) {
    setUser(firebaseUser);
    if (!firebaseUser) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const [{ data: profile }, { data: applications }] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", firebaseUser.uid).maybeSingle(),
      supabase
        .from("team_applications")
        .select("*")
        .eq("applicant_id", firebaseUser.uid)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    setRole(profile?.role || "driver");
    setApplication(applications?.[0] || null);
    setLoading(false);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      void loadForUser(firebaseUser);
    });
    return unsubscribe;
  }, []);

  async function submitApplication(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage("");

    const supabase = createClient();
    const { data, error } = await supabase
      .from("team_applications")
      .insert({
        applicant_id: user.uid,
        applicant_name: user.displayName || "",
        applicant_email: user.email || "",
        team_name: teamName.trim(),
        club: club.trim(),
        reason: reason.trim(),
        status: "pending",
      })
      .select("*")
      .single();

    if (error) {
      setMessage(error.message);
    } else {
      setApplication(data);
      setTeamName("");
      setClub("");
      setReason("");
      setMessage("Your team registration application has been submitted for admin approval.");
    }

    setSaving(false);
  }

  if (loading) return null;

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
      </div>
    );
  }

  if (application?.status === "approved") {
    return (
      <div className="card">
        <h2>Team Registration Approved</h2>
        <p>Your team application has been approved.</p>
        <a className="btn" href="/teams">Open Team Area</a>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Register a Team</h2>
      <p className="muted">Apply to register a team in the RC Endurance Series. An admin will review your application.</p>

      <form onSubmit={submitApplication} className="space">
        <label>
          Team name
          <input className="input" required value={teamName} onChange={(e) => setTeamName(e.target.value)} />
        </label>

        <label>
          Club
          <input className="input" value={club} onChange={(e) => setClub(e.target.value)} />
        </label>

        <label>
          About the team
          <textarea className="input" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Tell the organiser about your team." />
        </label>

        <button className="btn" disabled={saving}>
          {saving ? "Submitting..." : "Submit team application"}
        </button>

        {message && <p className="notice">{message}</p>}
      </form>
    </div>
  );
}
