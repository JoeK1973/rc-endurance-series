import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

export async function markRegistrationPaid(orderId: string, captureId: string, amountValue: string, currency: string) {
  const db = adminDb();
  const snapshot = await db.collection("round_registrations").where("paypal_order_id", "==", orderId).limit(1).get();
  if (snapshot.empty) throw new Error("REGISTRATION_NOT_FOUND");
  const ref = snapshot.docs[0].ref;
  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(ref);
    if (!fresh.exists) throw new Error("REGISTRATION_NOT_FOUND");
    const data = fresh.data()!;
    if (data.payment_status === "paid") {
      if (data.paypal_capture_id && data.paypal_capture_id !== captureId) throw new Error("PAYMENT_ALREADY_RECORDED");
      return;
    }
    if (Number(amountValue).toFixed(2) !== Number(data.amount).toFixed(2) || currency !== data.currency) throw new Error("PAYMENT_AMOUNT_MISMATCH");
    tx.update(ref, {
      status: "registered", payment_status: "paid", paypal_capture_id: captureId,
      paid_at: FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp(),
      payment_reservation_expires_at: FieldValue.delete(), waiting_list_position: FieldValue.delete(),
    });
  });
}
