"use client";

import { useEffect, useState } from "react";
import AdminTabs from "@/components/AdminTabs";
import AdminGuard from "@/components/AdminGuard";
import { createClient } from "@/lib/firebase/client";

type Round = {
  id: string;
  name: string;
  event_date: string;
  venue: string | null;
  results_url?: string | null;
};

export default function ManageResultsPage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);

    const { data, error } = await createClient()
      .from("rounds")
      .select("*")
      .order("event_date", { ascending: true });

    if (error) {
      setMessage(error.message);
      setRounds([]);
    } else {
      setRounds((data || []) as Round[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(round: Round) {
    setEditingId(round.id);
    setUrl(round.results_url || "");
    setMessage("");
  }

  function cancelEdit() {
    setEditingId(null);
    setUrl("");
  }

  async function save(round: Round) {
    const trimmed = url.trim();

    if (!trimmed) {
      setMessage("Please enter a results URL.");
      return;
    }

    try {
      const parsed = new URL(trimmed);

      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Only http:// and https:// results links are allowed.");
      }
    } catch {
      setMessage("Please enter a valid http:// or https:// results URL.");
      return;
    }

    setBusy(round.id);
    setMessage("");

    const { error } = await createClient()
      .from("rounds")
      .update({ results_url: trimmed })
      .eq("id", round.id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(round.name + " results link saved.");
      cancelEdit();
      await load();
    }

    setBusy(null);
  }

  async function remove(round: Round) {
    if (!confirm("Remove the results link for " + round.name + "?")) {
      return;
    }

    setBusy(round.id);
    setMessage("");

    const { error } = await createClient()
      .from("rounds")
      .update({ results_url: null })
      .eq("id", round.id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(round.name + " results link removed.");

      if (editingId === round.id) {
        cancelEdit();
      }

      await load();
    }

    setBusy(null);
  }

  return (
    <AdminGuard>
      <>
        <h1>Admin</h1>
        <p className="muted">Manage round results links.</p>
        <AdminTabs />

        {message && <div className="notice space">{message}</div>}

        <div className="card space">
          <h2>Manage Results</h2>
          <p className="muted">
            Add the external results page for each championship round.
          </p>

          {loading ? (
            <p className="muted">Loading rounds...</p>
          ) : !rounds.length ? (
            <p className="muted">No rounds have been added yet.</p>
          ) : (
            <div className="space">
              {rounds.map((round) => (
                <div className="roundRow" key={round.id}>
                  <div>
                    <b>{round.name}</b>
                    <br />
                    <span className="muted">
                      {round.event_date}
                      {round.venue ? " · " + round.venue : ""}
                    </span>
                  </div>

                  {editingId === round.id ? (
                    <div className="actionRow">
                      <input
                        className="input"
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/results"
                        aria-label={"Results URL for " + round.name}
                      />
                      <button
                        className="btn small"
                        disabled={busy === round.id}
                        onClick={() => void save(round)}
                      >
                        {busy === round.id ? "Saving..." : "Save"}
                      </button>
                      <button
                        className="btn secondary small"
                        disabled={busy === round.id}
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="actionRow">
                      {round.results_url ? (
                        <a
                          className="btn secondary small"
                          href={round.results_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View results
                        </a>
                      ) : (
                        <span className="muted">No results link</span>
                      )}

                      <button
                        className="btn small"
                        disabled={busy === round.id}
                        onClick={() => startEdit(round)}
                      >
                        {round.results_url ? "Edit" : "Add link"}
                      </button>

                      {round.results_url && (
                        <button
                          className="btn danger small"
                          disabled={busy === round.id}
                          onClick={() => void remove(round)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    </AdminGuard>
  );
}
