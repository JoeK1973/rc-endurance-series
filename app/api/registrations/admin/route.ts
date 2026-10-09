import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb, requireAdmin } from "@/lib/firebase/admin";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const db = adminDb();
    const [regs, rounds] = await Promise.all([db.collection("round_registrations").get(), db.collection("rounds").get()]);
    const roundMap = new Map(rounds.docs.map((d) => [d.id, { id: d.id, ...d.data() }]));
    const registrations = regs.docs.map((d) => ({ id: d.id, ...d.data(), created_at: d.data().created_at?.toDate?.().toISOString() || null, paid_at: d.data().paid_at?.toDate?.().toISOString() || null, round: roundMap.get(d.data().round_id) || null }));
    return Response.json({ registrations, rounds: rounds.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (error: any) {
    return Response.json({ error: error?.message === "UNAUTHENTICATED" ? "Please sign in." : "Admin access required." }, { status: error?.message === "UNAUTHENTICATED" ? 401 : 403 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const { registrationId, action, note } = await request.json();
    if (!registrationId || !["cancel", "record_refund", "reopen_waitlist"].includes(action)) return Response.json({ error: "Invalid registration action." }, { status: 400 });
    const db = adminDb();
    const ref = db.collection("round_registrations").doc(String(registrationId));
    const snap = await ref.get();
    if (!snap.exists) return Response.json({ error: "Registration not found." }, { status: 404 });
    const data = snap.data()!;
    if (action === "cancel") {
      const expiry = data.payment_reservation_expires_at?.toDate?.();
      const heldPlace = (data.status === "registered" && data.payment_status === "paid") || (data.status === "payment_pending" && expiry && expiry.getTime() > Date.now()) || (data.status === "payment_offer" && data.offer_expires_at?.toDate?.()?.getTime() > Date.now());
      const roundSnap = await db.collection("rounds").doc(data.round_id).get();
      const roundData = roundSnap.data() || {};
      const eventDate = roundData.event_date ? new Date(roundData.event_date) : null;
      const defaultClose = eventDate ? new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000) : new Date(0);
      const closeDate = roundData.registration_close_override ? new Date(roundData.registration_close_override) : defaultClose;
      const registrationOpen = roundData.registration_open !== false && Date.now() < closeDate.getTime();
      const roundWaiters = heldPlace && registrationOpen ? await db.collection("round_registrations").where("round_id", "==", data.round_id).where("status", "==", "waiting_list").get() : null;
      const next = roundWaiters?.docs.sort((a, b) => (Number(a.data().waiting_list_position) || 999999) - (Number(b.data().waiting_list_position) || 999999))[0];
      await db.runTransaction(async (tx) => {
        tx.update(ref, { status: "cancelled", cancelled_at: FieldValue.serverTimestamp(), cancelled_by: admin.uid, cancellation_note: String(note || "").slice(0, 500), updated_at: FieldValue.serverTimestamp() });
        if (next) tx.update(next.ref, { status: "payment_offer", payment_status: "not_started", offered_at: FieldValue.serverTimestamp(), offer_expires_at: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)), waiting_list_position: FieldValue.delete(), updated_at: FieldValue.serverTimestamp() });
      });
      return Response.json({ ok: true, message: next ? "Registration cancelled. The next waiting-list team has been offered the place for 24 hours. Any refund must be handled manually in PayPal." : "Registration cancelled. Any refund must be handled manually in PayPal." });
    }
    if (action === "record_refund") {
      if (data.payment_status !== "paid") return Response.json({ error: "Only a paid registration can have a refund recorded." }, { status: 400 });
      if (data.status !== "cancelled") return Response.json({ error: "Cancel the registration first, then record the manual PayPal refund." }, { status: 400 });
      await ref.update({ payment_status: "refunded", refund_status: "refunded_manually", refund_note: String(note || "").slice(0, 500), refunded_at: FieldValue.serverTimestamp(), refunded_by: admin.uid, updated_at: FieldValue.serverTimestamp() });
      return Response.json({ ok: true, message: "Manual refund recorded. This does not issue a refund through PayPal." });
    }
    await ref.update({ status: "waiting_list", payment_status: "not_started", waiting_list_position: Number(data.waiting_list_position) || 1, updated_at: FieldValue.serverTimestamp() });
    return Response.json({ ok: true });
  } catch (error: any) {
    return Response.json({ error: error?.message === "UNAUTHENTICATED" ? "Please sign in." : "Admin access required." }, { status: error?.message === "UNAUTHENTICATED" ? 401 : 403 });
  }
}
