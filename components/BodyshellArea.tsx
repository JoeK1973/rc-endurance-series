"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/firebase/client";
import BodyshellChat from "@/components/BodyshellChat";

type Team = {
  id: string;
  name: string;
  manager_id: string;
  approved_livery_url?: string | null;
};

export default function BodyshellArea() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    const client = createClient();
    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const result = await client
      .from("teams")
      .select("id,name,manager_id,approved_livery_url")
      .eq("manager_id", user.id)
      .maybeSingle();

    if (result.error) {
      setError(result.error.message);
    } else {
      setTeam((result.data || null) as Team | null);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <div className="card">Loading bodyshell submission...</div>;
  }

  if (error) {
    return (
      <div className="card">
        <div className="notice">{error}</div>
        <button className="btn space" onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="card">
        <h2>Create your team first</h2>
        <p className="muted">
          Your team must exist before a bodyshell submission can be started.
        </p>
      </div>
    );
  }

  return (
    <BodyshellChat
      teamId={team.id}
      teamName={team.name}
      managerId={team.manager_id}
      isAdmin={false}
      approvedLiveryUrl={team.approved_livery_url}
      onApproved={load}
    />
  );
}
