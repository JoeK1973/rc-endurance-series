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
      <div className="pageHeading">
        <div className="eyebrow">RC ENDURANCE SERIES / SERIES DETAILS</div>
        <h1>Championship Regulations</h1>
        <p className="muted">Rules, requirements and guidance for competing in the series.</p>
      </div>
      <ChampionshipTabs />
      <div className="card space championshipContentCard">
        <h2>Regulations and documents</h2>
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
