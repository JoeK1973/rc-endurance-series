"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/client";

type Regulation = { id: string; name: string; url: string; created_at?: string; updated_at?: string };

async function getToken() {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in again.");
  return user.getIdToken();
}

export default function AdminRegulations() {
  const [items, setItems] = useState<Regulation[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      const response = await fetch("/api/regulations", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load regulations.");
      setItems(Array.isArray(result.regulations) ? result.regulations : []);
    } catch (err: any) {
      setError(err?.message || "Could not load regulations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function validUrl(value: string) {
    try {
      const parsed = new URL(value.trim());
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch { return false; }
  }

  async function save(action: "create" | "update" | "delete", values: { id?: string; name?: string; url?: string }) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const token = await getToken();
      const response = await fetch("/api/regulations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, ...values }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save the regulation link.");
      if (action === "delete") {
        setItems(current => current.filter(item => item.id !== values.id));
        setNotice("Regulation link deleted.");
      } else if (action === "create") {
        setItems(current => [...current, result.regulation].sort((a, b) => a.name.localeCompare(b.name)));
        setName(""); setUrl("");
        setNotice("Regulation link added.");
      } else {
        setItems(current => current.map(item => item.id === values.id ? result.regulation : item).sort((a, b) => a.name.localeCompare(b.name)));
        setEditingId(null);
        setNotice("Regulation link updated.");
      }
    } catch (err: any) {
      setError(err?.message || "Could not save the regulation link.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="card">Loading regulation links...</div>;

  return (
    <section className="card space">
      <h2>Manage Regulations</h2>
      <p className="muted">Add links to championship rules and regulations. These will be visible to everyone on the Championship → Regulations page.</p>
      {error && <div className="notice">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      <div className="card space">
        <h3>Add a regulation link</h3>
        <label style={{ display: "block", fontWeight: 600, marginTop: 8 }} htmlFor="regulation-name">Document name</label>
        <input id="regulation-name" className="input" value={name} maxLength={100} placeholder="e.g. 2027 Endurance Rules" onChange={event => setName(event.target.value)} />
        <label style={{ display: "block", fontWeight: 600, marginTop: 8 }} htmlFor="regulation-url">Document URL</label>
        <input id="regulation-url" className="input" type="url" value={url} placeholder="https://..." onChange={event => setUrl(event.target.value)} />
        <div className="actionRow">
          <button className="btn" disabled={saving || !name.trim() || !validUrl(url)} onClick={() => void save("create", { name: name.trim(), url: url.trim() })}>{saving ? "Saving..." : "Add link"}</button>
        </div>
      </div>

      <h3>Published links</h3>
      {items.length === 0 ? <p className="muted">No regulation links have been added yet.</p> : (
        <div className="space">
          {items.map(item => {
            const editing = editingId === item.id;
            return <div className="card space" key={item.id}>
              {editing ? <>
                <label style={{ display: "block", fontWeight: 600, marginTop: 8 }} htmlFor={`edit-reg-name-${item.id}`}>Document name</label>
                <input id={`edit-reg-name-${item.id}`} className="input" value={editName} maxLength={100} onChange={event => setEditName(event.target.value)} />
                <label style={{ display: "block", fontWeight: 600, marginTop: 8 }} htmlFor={`edit-reg-url-${item.id}`}>Document URL</label>
                <input id={`edit-reg-url-${item.id}`} className="input" type="url" value={editUrl} onChange={event => setEditUrl(event.target.value)} />
                <div className="actionRow">
                  <button className="btn" disabled={saving || !editName.trim() || !validUrl(editUrl)} onClick={() => void save("update", { id: item.id, name: editName.trim(), url: editUrl.trim() })}>Save changes</button>
                  <button className="btn secondary" disabled={saving} onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </> : <>
                <div className="actionRow" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3>{item.name}</h3>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a>
                  </div>
                  <div className="actionRow">
                    <button className="btn secondary" disabled={saving} onClick={() => { setEditingId(item.id); setEditName(item.name); setEditUrl(item.url); }}>Edit</button>
                    <button className="btn danger" disabled={saving} onClick={() => { if (window.confirm(`Delete the link “${item.name}”?`)) void save("delete", { id: item.id }); }}>Delete</button>
                  </div>
                </div>
              </>}
            </div>;
          })}
        </div>
      )}
      <button className="btn secondary" disabled={saving} onClick={() => void load()}>Refresh links</button>
    </section>
  );
}
