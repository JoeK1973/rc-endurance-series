"use client";
import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase/client";
import { createClient } from "@/lib/firebase/client";

type Round = { id: string; name: string; event_date: string; venue?: string | null; series_year?: number; registration_open?: boolean; registration_close_override?: string | null; entry_limit?: number };
type Registration = { id: string; round_id: string; round_name: string; series_year: number; status: string; payment_status: string; amount: number; currency: string; paypal_order_id?: string; waiting_list_position?: number; payment_reservation_expires_at?: string | null; offer_expires_at?: string | null; paid_at?: string | null; refund_status?: string };
const statusLabel = (r: Registration) => r.status === "registered" ? "Registered · Paid" : r.status === "payment_pending" ? "Payment pending" : r.status === "waiting_list" ? `Waiting list · #${r.waiting_list_position || "—"}` : r.status === "payment_offer" ? "Place offered · 24 hours to pay" : r.status === "expired" ? "Payment expired" : r.status === "cancelled" ? "Cancelled" : r.status;

export default function RegistrationArea() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const token = useCallback(async () => {
    // Wait for Firebase to restore its persisted user after returning from PayPal.
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) throw new Error("Your session is no longer signed in. Please sign in again, then use Complete payment to resume.");
    return user.getIdToken();
  }, []);
  const load = useCallback(async () => {
    const client = createClient();
    const [{ data: roundData }, idToken] = await Promise.all([client.from("rounds").select("*").order("event_date"), token()]);
    setRounds((roundData || []) as Round[]);
    const response = await fetch("/api/registrations/mine", { headers: { Authorization: `Bearer ${idToken}` }, cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load registrations.");
    setRegistrations(data.registrations || []);
  }, [token]);
  useEffect(() => { load().catch((e) => setMessage(e.message)); }, [load]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("registration");
    const registrationId = params.get("registrationId");
    const orderId = params.get("token");
    if (result !== "success" || !registrationId || !orderId) return;
    let cancelled = false;
    (async () => {
      try {
        setBusy(registrationId); setMessage("Confirming payment with PayPal…");
        const idToken = await token();
        const response = await fetch("/api/registrations/capture", { method: "POST", headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ registrationId, orderId }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Payment confirmation failed.");
        if (!cancelled) { setMessage("Payment confirmed — your team is registered for this round."); await load(); window.history.replaceState({}, "", "/teams"); }
      } catch (e: any) { if (!cancelled) setMessage(e.message || "Payment confirmation failed."); }
      finally { if (!cancelled) setBusy(""); }
    })();
    return () => { cancelled = true; };
  }, [token, load]);

  async function start(round: Round) {
    try {
      setBusy(round.id); setMessage("");
      const idToken = await token();
      const response = await fetch("/api/registrations/start", { method: "POST", headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ roundId: round.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start registration.");
      if (data.status === "waiting_list") { setMessage(`This round is full. Your team has joined the waiting list at position ${data.position}.`); await load(); return; }
      if (data.approveUrl) { window.location.href = data.approveUrl; return; }
      throw new Error("PayPal has not provided a checkout link. Please try again.");
    } catch (e: any) { setMessage(e.message || "Could not start registration."); await load().catch(() => {}); }
    finally { setBusy(""); }
  }

  const regByRound = new Map<string, Registration>(registrations.map((r) => [r.round_id, r] as [string, Registration]));
  return <div className="space">
    <div className="card"><h2>Round Registration</h2><p className="muted">Register your team for each round. Entry is £100 per team per round. A place is confirmed only after PayPal confirms payment.</p><p><b>Maximum entries:</b> 10 teams per round. Unpaid checkout reservations expire after 30 minutes. Registration normally closes seven days before the event.</p></div>
    {message && <div className="card" role="status">{message}</div>}
    {!rounds.length && <div className="card muted">No rounds have been published yet.</div>}
    {rounds.map((round) => {
      const registration = regByRound.get(round.id);
      const eventDate = new Date(`${round.event_date}T12:00:00`);
      const defaultClose = new Date(eventDate.getTime() - 7 * 86400000);
      const closeDate = round.registration_close_override ? new Date(`${round.registration_close_override}T12:00:00`) : defaultClose;
      const closed = round.registration_open === false || Date.now() >= closeDate.getTime();
      const pendingExpired = registration?.status === "payment_pending" && registration.payment_reservation_expires_at && new Date(registration.payment_reservation_expires_at).getTime() <= Date.now();
      const paid = registration?.status === "registered" && registration.payment_status === "paid";
      const pending = registration?.status === "payment_pending" && !pendingExpired;
      const hasOffer = registration?.status === "payment_offer" && (!registration.offer_expires_at || new Date(registration.offer_expires_at).getTime() > Date.now());
      const expiredOffer = registration?.status === "payment_offer" && !hasOffer;
      const canStart = !paid && !pending && !hasOffer && registration?.status !== "waiting_list" && registration?.status !== "cancelled" && !closed;
      return <div className="card" key={round.id}>
        <div className="roundRow"><div><h3>{round.series_year || eventDate.getFullYear()} — {round.name}</h3><div className="muted">{round.event_date}{round.venue ? ` · ${round.venue}` : ""}</div><div className="muted">Registration closes {closeDate.toLocaleDateString("en-GB")}{round.registration_open === false ? " · Closed by organiser" : ""}</div></div><strong>£100.00</strong></div>
        {registration && <p><b>Status:</b> {statusLabel(registration)}{registration.refund_status === "refunded_manually" ? " · Refund recorded" : ""}</p>}
        {paid && <p className="muted">Your entry is confirmed. You can continue to manage your driver lineup separately.</p>}
        {pending && <p className="muted">Your place is temporarily reserved until {registration?.payment_reservation_expires_at ? new Date(registration.payment_reservation_expires_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "the reservation expires"}. Select Complete payment to continue.</p>}
        {registration?.status === "waiting_list" && <p className="muted">You will be offered a place if one becomes available. No payment has been taken.</p>}
        {hasOffer && <p className="muted">A place has been offered to your team. You have 24 hours to complete the £100 payment.</p>}
        {expiredOffer && <p className="muted">Your place offer has expired. Check the current waiting-list status below.</p>}
        {pendingExpired && <p className="muted">The 30-minute payment reservation has expired. Start again if registration is still open.</p>}
        {canStart && <button className="btn" disabled={!!busy} onClick={() => start(round)}>{busy === round.id ? "Please wait…" : expiredOffer ? "Check place status" : "Register & Pay £100"}</button>}
        {(pending || hasOffer) && <button className="btn" disabled={!!busy} onClick={() => start(round)}>{busy === round.id ? "Opening PayPal…" : "Complete payment"}</button>}
        {closed && !paid && !pending && registration?.status !== "waiting_list" && <span className="muted">Registration closed</span>}
      </div>;
    })}
  </div>;
}
