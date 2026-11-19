"use client";

import { useEffect, useState } from "react";
import ChampionshipTabs from "@/components/ChampionshipTabs";
import AppIcon from "@/components/AppIcon";
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
      <div className="pageHeading">
        <div className="eyebrow">RC ENDURANCE SERIES / SERIES DETAILS</div>
        <h1>Championship Calendar</h1>
        <p className="muted">View the championship rounds, dates and venues.</p>
      </div>
      <ChampionshipTabs />

      <div className="championshipRoundList">
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
            <article className="card championshipRoundCard" key={round.id}>
              <span className="championshipRoundIcon"><AppIcon name="calendar" size={21} /></span>
              <div><h2>{round.name}</h2><p className="muted">{round.event_date}{round.venue ? ` · ${round.venue}` : ""}</p></div>
            </article>
          ))
        )}
      </div>
    </>
  );
}
