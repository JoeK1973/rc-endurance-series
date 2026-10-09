import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb, requireUser } from "@/lib/firebase/admin";
import { paypalRequest } from "@/lib/paypal";

const RESERVATION_MS = 30 * 60 * 1000;
const asDate = (value: any) => value?.toDate ? value.toDate() : value ? new Date(value) : null;

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const { roundId } = await request.json();
    if (!roundId || typeof roundId !== "string") return Response.json({ error: "Select a round." }, { status: 400 });
    const db = adminDb();
    const teamSnap = await db.collection("teams").where("manager_id", "==", user.uid).limit(1).get();
    if (teamSnap.empty) return Response.json({ error: "You need a registered team before entering a round." }, { status: 400 });
    const team = teamSnap.docs[0];
    const roundRef = db.collection("rounds").doc(roundId);
    const regId = `${roundId}__${team.id}`;
    const regRef = db.collection("round_registrations").doc(regId);
    const capacityRef = db.collection("round_registration_capacity").doc(roundId);
    const now = new Date();

    const result = await db.runTransaction(async (tx) => {
      const [roundSnap, ownSnap, regsSnap, capacitySnap] = await Promise.all([
        tx.get(roundRef), tx.get(regRef),
        tx.get(db.collection("round_registrations").where("round_id", "==", roundId)),
        tx.get(capacityRef),
      ]);
      if (!roundSnap.exists) throw new Error("ROUND_NOT_FOUND");
      const round = roundSnap.data()!;
      if (round.registration_open === false) throw new Error("REGISTRATION_CLOSED_MANUALLY");
      const eventDate = asDate(round.event_date);
      if (!eventDate) throw new Error("ROUND_DATE_MISSING");
      const defaultClose = new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      const closeAt = asDate(round.registration_close_override) || defaultClose;
      if (now >= closeAt) throw new Error("REGISTRATION_CLOSED");

      if (ownSnap.exists) {
        const existing = ownSnap.data()!;
        if (existing.status === "registered" || existing.payment_status === "paid") throw new Error("ALREADY_REGISTERED");
        if (existing.status === "payment_pending" && asDate(existing.payment_reservation_expires_at)?.getTime() > now.getTime()) {
          return { kind: "resume", registrationId: regId, orderId: existing.paypal_order_id || null };
        }
        if (existing.status === "payment_offer" && asDate(existing.offer_expires_at)?.getTime() > now.getTime()) {
          // A place has been offered to this team; it may proceed even if the round is otherwise full.
        }
      }

      let paid = 0;
      let pending = 0;
      const expiredRefs: any[] = [];
      for (const doc of regsSnap.docs) {
        const data = doc.data();
        if (doc.id === regId) {
          if (data.status === "payment_pending" && !(asDate(data.payment_reservation_expires_at)?.getTime() > now.getTime())) expiredRefs.push(doc.ref);
          else if (data.status === "payment_offer" && !(asDate(data.offer_expires_at)?.getTime() > now.getTime())) expiredRefs.push(doc.ref);
          continue;
        }
        if (data.status === "registered" && data.payment_status === "paid") paid++;
        else if (data.status === "payment_pending") {
          const expiry = asDate(data.payment_reservation_expires_at);
          if (expiry && expiry.getTime() > now.getTime()) pending++;
          else expiredRefs.push(doc.ref);
        } else if (data.status === "payment_offer") {
          const offerExpiry = asDate(data.offer_expires_at);
          if (offerExpiry && offerExpiry.getTime() > now.getTime()) pending++;
          else expiredRefs.push(doc.ref);
        }
      }
      for (const ref of expiredRefs) {
        if (ref.id !== regId) tx.update(ref, { status: "expired", payment_status: "expired", updated_at: FieldValue.serverTimestamp() });
      }
      const limit = Math.max(1, Math.min(1000, Number(round.entry_limit) || 10));
      const current = ownSnap.exists ? ownSnap.data()! : null;
      const hasValidOffer = current?.status === "payment_offer" && asDate(current.offer_expires_at)?.getTime() > now.getTime();
      if (expiredRefs.length) {
        const waiters = regsSnap.docs.filter((d) => d.data().status === "waiting_list")
          .sort((a, b) => (Number(a.data().waiting_list_position) || 999999) - (Number(b.data().waiting_list_position) || 999999));
        if (waiters.length) {
          const next = waiters[0];
          tx.update(next.ref, { status: "payment_offer", payment_status: "not_started", offered_at: FieldValue.serverTimestamp(), offer_expires_at: Timestamp.fromDate(new Date(now.getTime() + 24 * 60 * 60 * 1000)), waiting_list_position: FieldValue.delete(), updated_at: FieldValue.serverTimestamp() });
          pending++;
        }
      }
      if (paid + pending >= limit && !hasValidOffer) {
        if (current?.status === "waiting_list") return { kind: "waiting", registrationId: regId, position: current.waiting_list_position || 1 };
        tx.set(capacityRef, { revision: Number(capacitySnap.data()?.revision || 0) + 1, updated_at: FieldValue.serverTimestamp() });
        const waiters = regsSnap.docs.filter((d) => d.id !== regId && d.data().status === "waiting_list");
        const position = waiters.reduce((max, d) => Math.max(max, Number(d.data().waiting_list_position) || 0), 0) + 1;
        tx.set(regRef, {
          id: regId, team_id: team.id, team_name: team.data().name || "Team", manager_id: user.uid,
          round_id: roundId, round_name: round.name || "Round", series_year: Number(round.series_year) || (eventDate.getFullYear()),
          status: "waiting_list", payment_status: "not_started", waiting_list_position: position,
          amount: 100, currency: "GBP", created_at: FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp(),
        });
        return { kind: "waiting", registrationId: regId, position };
      }
      const expiry = new Date(now.getTime() + RESERVATION_MS);
      tx.set(capacityRef, { revision: Number(capacitySnap.data()?.revision || 0) + 1, updated_at: FieldValue.serverTimestamp() });
      tx.set(regRef, {
        id: regId, team_id: team.id, team_name: team.data().name || "Team", manager_id: user.uid,
        round_id: roundId, round_name: round.name || "Round", series_year: Number(round.series_year) || eventDate.getFullYear(),
        status: "payment_pending", payment_status: "pending", amount: 100, currency: "GBP",
        payment_pending_at: FieldValue.serverTimestamp(), payment_reservation_expires_at: Timestamp.fromDate(expiry),
        created_at: current?.created_at || FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp(),
        ...(current?.paypal_order_id ? { paypal_order_id: current.paypal_order_id } : {}),
        ...(hasValidOffer ? { offered_place_accepted_at: FieldValue.serverTimestamp() } : {}),
      }, { merge: true });
      return { kind: "pay", registrationId: regId, orderId: current?.paypal_order_id || null };
    });

    if (result.kind === "waiting") return Response.json({ status: "waiting_list", registrationId: result.registrationId, position: result.position });
    if (result.kind === "resume" && result.orderId) {
      const existingOrder = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(result.orderId)}`, { method: "GET" });
      const approveUrl = existingOrder.links?.find((l: any) => l.rel === "approve" || l.rel === "payer-action")?.href;
      if (approveUrl) return Response.json({ status: "payment_pending", registrationId: result.registrationId, orderId: result.orderId, approveUrl, resume: true });
    }

    const order = await paypalRequest("/v2/checkout/orders", {
      method: "POST",
      headers: { "PayPal-Request-Id": `registration-${result.registrationId}-${Date.now()}` },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: result.registrationId,
          custom_id: result.registrationId,
          description: `${result.registrationId} — RC Endurance Series entry`,
          amount: { currency_code: "GBP", value: "100.00" },
        }],
        application_context: {
          brand_name: "RC Endurance Series", user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING",
          return_url: `${new URL(request.url).origin}/teams?registration=success&registrationId=${encodeURIComponent(result.registrationId)}`,
          cancel_url: `${new URL(request.url).origin}/teams?registration=cancelled&registrationId=${encodeURIComponent(result.registrationId)}`,
        },
      }),
    });
    await regRef.update({ paypal_order_id: order.id, updated_at: FieldValue.serverTimestamp() });
    return Response.json({ status: "payment_pending", registrationId: result.registrationId, orderId: order.id, approveUrl: order.links?.find((l: any) => l.rel === "approve" || l.rel === "payer-action")?.href });
  } catch (error: any) {
    const message = error?.message || "Could not start registration.";
    const map: Record<string, string> = {
      UNAUTHENTICATED: "Please sign in again.", FORBIDDEN: "You do not have permission.", ROUND_NOT_FOUND: "Round not found.",
      REGISTRATION_CLOSED_MANUALLY: "Registration for this round is currently closed.", REGISTRATION_CLOSED: "Registration has closed for this round.",
      ROUND_DATE_MISSING: "This round does not have a valid event date.", ALREADY_REGISTERED: "Your team is already registered and paid for this round.",
    };
    return Response.json({ error: map[message] || message }, { status: message === "UNAUTHENTICATED" ? 401 : 400 });
  }
}
