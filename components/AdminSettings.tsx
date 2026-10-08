"use client";

import { useState } from "react";
import { createClient } from "@/lib/firebase/client";

export default function AdminSettings() {
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState("");

  async function resetLiverySubmissions() {
    const confirmed = window.confirm(
      "Reset all livery submissions? This removes every team's agreed livery and requires a new bodyshell submission. Existing chat history will be kept."
    );

    if (!confirmed) return;

    setResetting(true);
    setMessage("");

    const client = createClient();

    const result = await client.from("teams").select("id");

    if (result.error) {
      setMessage(result.error.message);
      setResetting(false);
      return;
    }

    const teams = result.data || [];

    const updates = await Promise.all(
      teams.map((team: { id: string }) =>
        client
          .from("teams")
          .update({
            livery_status: "reset",
            approved_livery_url: null,
            approved_livery_thumbnail_url: null,
            approved_livery_message_id: null,
            livery_approved_at: null,
            livery_reset_at: new Date().toISOString(),
          })
          .eq("id", team.id)
      )
    );

    const failed = updates.find((item: any) => item.error);

    if (failed?.error) {
      setMessage(failed.error.message);
    } else {
      setMessage(
        `Livery submissions reset for ${teams.length} team(s). Existing bodyshell chat history has been kept.`
      );
    }

    setResetting(false);
  }

  return (
    <div className="space">
      <div className="card">
        <h2>Settings</h2>
        <p className="muted">
          Administrative settings for the RC Endurance Series.
        </p>
      </div>

      <div className="card adminDangerCard">
        <div className="adminDangerHeader">
          <div>
            <h2>Reset livery submissions</h2>
            <p className="muted">
              Remove the agreed livery from every team and require a new
              submission. Existing bodyshell conversations and image history are
              not deleted.
            </p>
          </div>
          <span className="status reset">Destructive action</span>
        </div>

        <button
          className="btn danger"
          disabled={resetting}
          onClick={resetLiverySubmissions}
        >
          {resetting ? "Resetting..." : "Reset all livery submissions"}
        </button>

        {message && <div className="notice space">{message}</div>}
      </div>
    </div>
  );
}
