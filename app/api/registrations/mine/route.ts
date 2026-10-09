import { adminDb, requireUser } from "@/lib/firebase/admin";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const db = adminDb();
    const teams = await db.collection("teams").where("manager_id", "==", user.uid).limit(1).get();
    if (teams.empty) return Response.json({ registrations: [] });
    const teamId = teams.docs[0].id;
    const snap = await db.collection("round_registrations").where("team_id", "==", teamId).get();
    const registrations = snap.docs.map((d) => ({ id: d.id, ...d.data(), payment_reservation_expires_at: d.data().payment_reservation_expires_at?.toDate?.().toISOString() || null, offer_expires_at: d.data().offer_expires_at?.toDate?.().toISOString() || null, created_at: d.data().created_at?.toDate?.().toISOString() || null, paid_at: d.data().paid_at?.toDate?.().toISOString() || null }));
    return Response.json({ registrations });
  } catch (error: any) {
    return Response.json({ error: error?.message === "UNAUTHENTICATED" ? "Please sign in." : "Could not load registrations." }, { status: error?.message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}
