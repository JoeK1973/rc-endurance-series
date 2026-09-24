"use client";

import { useEffect, useState } from "react";
import ChampionshipTabs from "@/components/ChampionshipTabs";
import { createClient } from "@/lib/firebase/client";

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
    async function load() {
      const { data, error } = await createClient()
        .from("rounds")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setRounds((data || []) as Round[]);
      }

      setLoading(false);
    }

    void load();
  }, []);

  return (
    <>
      <h1>Championship</h1>
      <ChampionshipTabs />

      <div className="card space">
        <h2>Results</h2>

        {loading ? (
          <p className="muted">Loading results...</p>
        ) : error ? (
          <>
            <p>Could not load championship results.</p>
            <p className="muted">{error}</p>
          </>
        ) : !rounds.length ? (
          <p className="muted">
            No championship rounds have been published yet.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "620px",
              }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "12px 10px" }}>
                    Round Name
                  </th>
                  <th style={{ textAlign: "left", padding: "12px 10px" }}>
                    Date
                  </th>
                  <th style={{ textAlign: "left", padding: "12px 10px" }}>
                    Location
                  </th>
                  <th style={{ textAlign: "left", padding: "12px 10px" }}>
                    Results
                  </th>
                </tr>
              </thead>
              <tbody>
                {rounds.map((round) => (
                  <tr key={round.id}>
                    <td style={{ padding: "12px 10px" }}>{round.name}</td>
                    <td style={{ padding: "12px 10px" }}>
                      {round.event_date}
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      {round.venue || "—"}
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      {round.results_url ? (
                        <a
                          href={round.results_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View results
                        </a>
                      ) : (
                        <span className="muted">Not yet available</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
