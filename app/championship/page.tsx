"use client";

import { useEffect, useState } from "react";
import ChampionshipTabs from "@/components/ChampionshipTabs";
import { createClient } from "@/lib/firebase/client";

type Round = {
  id: string;
  name: string;
  event_date: string;
  venue: string | null;
};

export default function ChampionshipPage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error } = await createClient()
        .from("rounds")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) setError(error.message);
      setRounds((data || []) as Round[]);
      setLoading(false);
    }

    load();
  }, []);

  return (
    <>
      <h1>Championship</h1>
      <ChampionshipTabs />

      <div className="space">
        {loading ? (
          <div className="card">Loading championship rounds...</div>
        ) : error ? (
          <div className="card">
            <p>Could not load championship rounds.</p>
            <p className="muted">{error}</p>
          </div>
        ) : !rounds.length ? (
          <div className="card">No rounds have been published yet.</div>
        ) : (
          rounds.map((round) => (
            <div className="card space" key={round.id}>
              <h2>{round.name}</h2>
              <p className="muted">
                {round.event_date}
                {round.venue ? ` · ${round.venue}` : ""}
              </p>
            </div>
          ))
        )}
      </div>
    </>
  );
}
