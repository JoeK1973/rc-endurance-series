import { paypalRequest } from "@/lib/paypal";
import { markRegistrationPaid } from "@/lib/registration-payment";

export async function POST(request: Request) {
  try {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) return Response.json({ error: "Webhook is not configured." }, { status: 500 });
    const event = await request.json();
    const headers = {
      auth_algo: request.headers.get("paypal-auth-algo"),
      cert_url: request.headers.get("paypal-cert-url"),
      transmission_id: request.headers.get("paypal-transmission-id"),
      transmission_sig: request.headers.get("paypal-transmission-sig"),
      transmission_time: request.headers.get("paypal-transmission-time"),
    };
    if (Object.values(headers).some((v) => !v)) return Response.json({ error: "Missing signature headers." }, { status: 400 });
    const verification = await paypalRequest("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      body: JSON.stringify({
        transmission_id: headers.transmission_id, transmission_time: headers.transmission_time,
        cert_url: headers.cert_url, auth_algo: headers.auth_algo, transmission_sig: headers.transmission_sig,
        webhook_id: webhookId, webhook_event: event,
      }),
    });
    if (verification.verification_status !== "SUCCESS") return Response.json({ error: "Invalid webhook signature." }, { status: 400 });
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const resource = event.resource || {};
      const orderId = resource.supplementary_data?.related_ids?.order_id;
      if (orderId && resource.id && resource.amount?.value && resource.amount?.currency_code) {
        await markRegistrationPaid(orderId, resource.id, resource.amount.value, resource.amount.currency_code);
      }
    }
    return Response.json({ received: true });
  } catch (error: any) {
    console.error("PayPal webhook processing failed", error?.message || "unknown");
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
