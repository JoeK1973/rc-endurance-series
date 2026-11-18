import { adminDb, requireUser } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  try {
    const actor = await requireUser(request);
    const db = adminDb();
    const actorRef = db.collection("profiles").doc(actor.uid);
    const actorSnap = await actorRef.get();

    if (!actorSnap.exists || actorSnap.data()?.role !== "superuser") {
      return Response.json({ error: "Only the superuser can manage administrator permissions." }, { status: 403 });
    }

    const body = await request.json();
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
    const role = body?.role;
    if (!userId || !["driver", "admin"].includes(role)) {
      return Response.json({ error: "Invalid user or role." }, { status: 400 });
    }

    const targetRef = db.collection("profiles").doc(userId);
    const targetSnap = await targetRef.get();
    if (!targetSnap.exists) {
      return Response.json({ error: "User profile not found." }, { status: 404 });
    }
    if (targetSnap.data()?.role === "superuser") {
      return Response.json({ error: "The superuser account cannot be changed here." }, { status: 400 });
    }

    await targetRef.update({ role });
    return Response.json({ ok: true, userId, role });
  } catch (error: any) {
    const message = error?.message;
    const status = message === "UNAUTHENTICATED" ? 401 : 500;
    return Response.json({ error: message === "UNAUTHENTICATED" ? "Please sign in." : "Could not update administrator permissions." }, { status });
  }
}
