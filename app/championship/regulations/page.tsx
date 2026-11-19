"use client";

import { useEffect, useState } from "react";
import ChampionshipTabs from "@/components/ChampionshipTabs";

type Regulation = { id: string; name: string; url: string };

export default function RegulationsPage() {
  const [items, setItems] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/regulations", { cache: "no-store" })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load regulations.");
        if (active) setItems(Array.isArray(result.regulations) ? result.regulations : []);
      })
      .catch(err => { if (active) setError(err?.message || "Could not load regulations."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <>
      <h1>Championship</h1>
      <ChampionshipTabs />
      <div className="card space">
        <h2>Regulations</h2>
        <p className="muted">Rules and regulations for the RC Endurance Series.</p>
        {loading ? <p className="muted">Loading regulations...</p> : error ? <p className="notice">{error}</p> : items.length === 0 ? (
          <p className="muted">No regulations have been published yet.</p>
        ) : (
          <ul className="space">
            {items.map(item => <li key={item.id}><a href={item.url} target="_blank" rel="noopener noreferrer">{item.name}</a></li>)}
          </ul>
        )}
      </div>
    </>
  );
}
