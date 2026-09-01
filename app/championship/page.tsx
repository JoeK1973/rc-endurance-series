"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Round = {
  id: string;
  name: string;
  event_date: string;
  venue: string | null;
};

export default function ChampionshipPage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadRounds() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("rounds")
        .select("*")
        .order("event_date");

      if (error) {
        setMessage(`Could not load rounds: ${error.message}`);
        setLoading(false);
        return;
      }

      setRounds(data || []);
      setLoading(false);
    }

    loadRounds();
  }, []);

  return (
    <>
      <h1>Championship</h1>

      <div className="tabs">
        <Link href="/championship">Calendar</Link>
        <Link href="/championship/regulations">Regulations</Link>
        <Link href="/championship/results">Results</Link>
      </div>

      <div className="space">
        {loading && (
          <div className="card">
            Loading championship rounds...
          </div>
        )}

        {!loading && message && (
          <div className="card">
            {message}
          </div>
        )}

        {!loading && !message && rounds.length === 0 && (
          <div className="card">
            No rounds have been published yet.
          </div>
        )}

        {!loading &&
          !message &&
          rounds.map((round) => (
            <div className="card space" key={round.id}>
              <h2>{round.name}</h2>

              <p className="muted">
                {round.event_date}
                {round.venue ? ` · ${round.venue}` : ""}
              </p>
            </div>
          ))}
      </div>
    </>
  );
}
