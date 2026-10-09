import { adminDb, requireUser } from "@/lib/firebase/admin";
import { paypalRequest } from "@/lib/paypal";
import { markRegistrationPaid } from "@/lib/registration-payment";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const { registrationId, orderId } = await request.json();
    if (!registrationId || !orderId) return Response.json({ error: "Registration and PayPal order are required." }, { status: 400 });
    const ref = adminDb().collection("round_registrations").doc(String(registrationId));
    const snap = await ref.get();
    if (!snap.exists) return Response.json({ error: "Registration not found." }, { status: 404 });
    const registration = snap.data()!;
    if (registration.manager_id !== user.uid) return Response.json({ error: "You cannot complete payment for this registration." }, { status: 403 });
    if (registration.paypal_order_id !== orderId) return Response.json({ error: "PayPal order does not match this registration." }, { status: 400 });
    if (registration.payment_status === "paid") return Response.json({ status: "registered", message: "Payment already confirmed." });
    if (registration.status !== "payment_pending") return Response.json({ error: "This registration is no longer awaiting payment." }, { status: 400 });
    const expiry = registration.payment_reservation_expires_at?.toDate?.();
    if (expiry && expiry.getTime() < Date.now()) return Response.json({ error: "The 30-minute payment reservation has expired. Please start again." }, { status: 410 });

    let order = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, { method: "GET" });
    if (order.status !== "COMPLETED") order = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST", body: "{}" });
    const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
    if (order.status !== "COMPLETED" || capture?.status !== "COMPLETED") return Response.json({ error: "PayPal has not confirmed a completed payment." }, { status: 402 });
    await markRegistrationPaid(orderId, capture.id, capture.amount?.value, capture.amount?.currency_code);
    return Response.json({ status: "registered", captureId: capture.id });
  } catch (error: any) {
    console.error("Registration capture failed", error?.message || "unknown");
    const msg = error?.message === "UNAUTHENTICATED" ? "Please sign in again." : "Payment could not be confirmed. If PayPal charged you, contact the championship administrator before trying again.";
    return Response.json({ error: msg }, { status: error?.message === "UNAUTHENTICATED" ? 401 : 400 });
  }
}
