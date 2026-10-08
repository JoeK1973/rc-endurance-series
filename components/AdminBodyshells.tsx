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

type Profile = {
  id: string;
  name: string | null;
};

export default function AdminBodyshells() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [selected, setSelected] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    const client = createClient();

    const [
      { data: teamRows, error: teamsError },
      { data: profileRows, error: profilesError },
    ] = await Promise.all([
      client.from("teams").select("*").order("name"),
      client.from("profiles").select("id,name"),
    ]);

    if (teamsError || profilesError) {
      setError(
        teamsError?.message ||
          profilesError?.message ||
          "Could not load teams."
      );
      setLoading(false);
      return;
    }

    const list = (teamRows || []) as Team[];
    const map: Record<string, Profile> = {};

    (profileRows || []).forEach((profile: Profile) => {
      map[profile.id] = profile;
    });

    setTeams(list);
    setProfiles(map);

    if (selected) {
      setSelected(list.find((team) => team.id === selected.id) || null);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <div className="card">Loading bodyshell submissions...</div>;
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

  return (
    <div className="grid two space">
      <div className="card">
        <h2>Bodyshell submissions</h2>
        <p className="muted">
          Select a team to review its discussion and approve its latest
          submitted bodyshell image.
        </p>

        <div className="space">
          {teams.map((team) => (
            <button
              key={team.id}
              className={`btn ${
                selected?.id === team.id ? "" : "secondary"
              }`}
              style={{
                width: "100%",
                textAlign: "left",
                marginBottom: 8,
              }}
              onClick={() => setSelected(team)}
            >
              <b>{team.name}</b>
              <br />
              <small>
                {profiles[team.manager_id]?.name || "Team manager"} ·{" "}
                {team.approved_livery_url
                  ? "Livery approved"
                  : "Awaiting approval"}
              </small>
            </button>
          ))}
        </div>

        {!teams.length && (
          <p className="muted">No teams have been created yet.</p>
        )}
      </div>

      <div>
        {selected ? (
          <BodyshellChat
            key={selected.id}
            teamId={selected.id}
            teamName={selected.name}
            managerId={selected.manager_id}
            isAdmin
            approvedLiveryUrl={selected.approved_livery_url}
            onApproved={load}
          />
        ) : (
          <div className="card">
            <h2>Select a team</h2>
            <p className="muted">
              Choose a team from the list to open its bodyshell chat.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
