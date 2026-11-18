"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/firebase/client";

type Team = { id: string; name: string; club?: string | null; manager_id: string };

export default function FindATeamPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contacting, setContacting] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function load() {
      const client = createClient();
      const { data: { user } } = await client.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      const { data, error } = await client.from("teams").select("id,name,club,manager_id,looking_for_drivers");
      if (error) setError(error.message);
      else setTeams(((data || []) as any[]).filter(t => t.looking_for_drivers === true && t.manager_id !== user.id));
      setLoading(false);
    }
    void load();
  }, []);

  async function contactTeam(team: Team) {
    setContacting(team.id); setNotice(""); setError("");
    const client = createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }
    const { data: existing, error: existingError } = await client
      .from("conversations")
      .select("id,round_id")
      .eq("team_id", team.id)
      .eq("driver_id", user.id)
      .limit(1)
      .maybeSingle();
    if (existingError) {
      setError(existingError.message);
      setContacting(null);
      return;
    }

    let conversationId = existing?.id;
    if (existing?.id) {
      // A driver contacting a team is opening a continuing team/championship
      // conversation, not a discussion tied to one particular race. If a
      // conversation already exists from an earlier round-specific contact,
      // retain its message history but remove that round association.
      if (existing.round_id) {
        const { error: updateError } = await client
          .from("conversations")
          .update({ round_id: null })
          .eq("id", existing.id);
        if (updateError) {
          setError(updateError.message);
          setContacting(null);
          return;
        }
      }
    } else {
      const { data, error } = await client
        .from("conversations")
        .insert({
          team_id: team.id,
          driver_id: user.id,
          manager_id: team.manager_id,
          round_id: null,
        })
        .select("id")
        .single();
      if (error || !data) {
        setError(error?.message || "Could not start a conversation.");
        setContacting(null);
        return;
      }
      conversationId = data.id;
    }
    window.location.href = `/messages/${conversationId}`;
  }

  return <><h1>Find a Team</h1><p className="muted">These teams have explicitly said they are looking for drivers. Contact a team to introduce yourself.</p>{loading ? <p>Loading teams...</p> : error ? <div className="notice">{error}</div> : teams.length ? <div className="grid two space">{teams.map(team => <div className="card" key={team.id}><h2>{team.name}</h2>{team.club && <p className="muted">{team.club}</p>}<button className="btn" disabled={contacting === team.id} onClick={() => void contactTeam(team)}>{contacting === team.id ? "Opening..." : "Contact Team"}</button></div>)}</div> : <div className="card space">There are currently no teams advertising for drivers. Please check again later.</div>}{notice && <p>{notice}</p>}</>;
}
