"use client";

import { useEffect, useState } from "react";
import ChampionshipTabs from "@/components/ChampionshipTabs";
import { auth, createClient } from "@/lib/firebase/client";

type Round = {
  id: string;
  name: string;
  event_date: string;
  venue: string | null;
  results_url?: string | null;
};

export default function ResultsPage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadResults() {
      try {
        // Firestore rules require an authenticated user to read round documents.
        // Wait for Firebase to restore the persisted session before querying.
        await auth.authStateReady();

        if (!auth.currentUser) {
          if (active) setError("Please sign in to view championship results.");
          return;
        }

        const { data, error: queryError } = await createClient()
          .from("rounds")
          .select("*")
          .order("event_date", { ascending: true });

        if (queryError) throw queryError;

        const published = ((data || []) as Round[]).filter(
          (round) => typeof round.results_url === "string" && round.results_url.trim() !== ""
        );

        if (active) setRounds(published);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Could not load championship results.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadResults();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <div className="pageHeading">
        <div className="eyebrow">RC ENDURANCE SERIES / SERIES DETAILS</div>
        <h1>Championship Results</h1>
        <p className="muted">Browse published results from completed championship rounds.</p>
      </div>
      <ChampionshipTabs />
      <div className="card space championshipContentCard">
        <h2>Published results</h2>
        <p className="muted">Select a round to view its published results.</p>

        {loading ? (
          <p className="muted">Loading results...</p>
        ) : error ? (
          <p className="notice">{error}</p>
        ) : rounds.length === 0 ? (
          <p className="muted">No round results have been published yet.</p>
        ) : (
          <div className="space">
            {rounds.map((round) => (
              <div className="roundRow" key={round.id}>
                <div>
                  <b>{round.name}</b>
                  <br />
                  <span className="muted">
                    {round.event_date}
                    {round.venue ? ` · ${round.venue}` : ""}
                  </span>
                </div>
                <a
                  className="btn"
                  href={round.results_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View results
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
