"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/firebase/client";

type Round = { id: string; name: string; event_date: string; venue: string | null; series_year?: number; registration_open?: boolean; registration_close_override?: string | null; entry_limit?: number };
export default function AdminRounds() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [closeOverride, setCloseOverride] = useState("");
  const [entryLimit, setEntryLimit] = useState("10");
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const load = async () => { const { data, error } = await createClient().from("rounds").select("*").order("event_date"); if (error) setMessage(error.message); setRounds((data || []) as Round[]); };
  useEffect(() => { load(); }, []);
  function clear() { setName(""); setDate(""); setVenue(""); setYear(String(new Date().getFullYear())); setCloseOverride(""); setEntryLimit("10"); setRegistrationOpen(true); setEditing(null); }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setMessage("");
    const values = { name, event_date: date, venue: venue || null, series_year: Number(year), entry_limit: Number(entryLimit), registration_open: registrationOpen, registration_close_override: closeOverride || null };
    const s = createClient(); const q = editing ? s.from("rounds").update(values).eq("id", editing) : s.from("rounds").insert(values);
    const { error } = await q; if (error) { setMessage(error.message); return; }
    setMessage(editing ? "Round updated." : "Round added."); clear(); load();
  }
  async function remove(id: string) { if (!confirm("Delete this round? Existing registrations may refer to it. Delete only if no entries exist.")) return; const { error } = await createClient().from("rounds").delete().eq("id", id); setMessage(error ? error.message : "Round deleted."); load(); }
  function edit(r: Round) { setEditing(r.id); setName(r.name); setDate(r.event_date); setVenue(r.venue || ""); setYear(String(r.series_year || new Date(`${r.event_date}T12:00:00`).getFullYear())); setCloseOverride(r.registration_close_override || ""); setEntryLimit(String(r.entry_limit || 10)); setRegistrationOpen(r.registration_open !== false); window.scrollTo({ top: 0, behavior: "smooth" }); }
  return <div className="space">
    <form className="card" onSubmit={save}>
      <h2>{editing ? "Edit round" : "Add a round"}</h2>
      <div className="grid two"><label>Series year<input className="input" type="number" required min="2000" max="2100" value={year} onChange={e => setYear(e.target.value)} /></label><label>Round name<input className="input" required value={name} onChange={e => setName(e.target.value)} placeholder="Round 1" /></label></div>
      <div className="grid two"><label>Event date<input className="input" required type="date" value={date} onChange={e => setDate(e.target.value)} /></label><label>Venue<input className="input" value={venue} onChange={e => setVenue(e.target.value)} placeholder="Club or venue" /></label></div>
      <h3>Registration settings</h3>
      <p className="muted">The default closing date is seven days before the event. Add an override only when needed.</p>
      <div className="grid two"><label>Closing date override (optional)<input className="input" type="date" value={closeOverride} onChange={e => setCloseOverride(e.target.value)} /></label><label>Maximum entries<input className="input" type="number" min="1" max="1000" required value={entryLimit} onChange={e => setEntryLimit(e.target.value)} /></label></div>
      <label className="checkboxRow"><input type="checkbox" checked={registrationOpen} onChange={e => setRegistrationOpen(e.target.checked)} /> Registration open (untick to close manually)</label>
      <button className="btn space" type="submit">{editing ? "Save changes" : "Add round"}</button>
      {editing && <button type="button" className="btn secondary space" onClick={clear}>Cancel</button>}
      {message && <p className="space" role="status">{message}</p>}
    </form>
    <div className="card space"><h2>Existing rounds</h2>{!rounds.length ? <p className="muted">No rounds have been added yet.</p> : rounds.map(r => {
      const event = new Date(`${r.event_date}T12:00:00`); const close = r.registration_close_override ? new Date(`${r.registration_close_override}T12:00:00`) : new Date(event.getTime() - 7 * 86400000);
      return <div className="roundRow" key={r.id}><div><b>{r.series_year || event.getFullYear()} — {r.name}</b><br /><span className="muted">{r.event_date}{r.venue ? ` · ${r.venue}` : ""}</span><br /><span className="muted">Registration {r.registration_open === false ? "manually closed" : "enabled"} · closes {close.toLocaleDateString("en-GB")} · limit {r.entry_limit || 10}</span></div><div><button className="btn small" onClick={() => edit(r)}>Edit</button><button className="btn danger small" onClick={() => remove(r.id)}>Delete</button></div></div>;
    })}</div>
  </div>;
}
