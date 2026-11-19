import { FieldValue } from "firebase-admin/firestore";
import { adminDb, requireAdmin } from "@/lib/firebase/admin";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const snap = await adminDb().collection("classes").get();
    const classes = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || "")));
    return Response.json({ classes });
  } catch (error: any) {
    return Response.json({ error: error?.message === "UNAUTHENTICATED" ? "Please sign in." : "Admin access required." }, { status: error?.message === "UNAUTHENTICATED" ? 401 : 403 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 40) return Response.json({ error: "Enter a class name of 1–40 characters." }, { status: 400 });
    const db = adminDb();
    const duplicate = await db.collection("classes").where("name_lower", "==", name.toLowerCase()).get();
    if (!duplicate.empty) return Response.json({ error: "That class already exists." }, { status: 409 });
    const ref = db.collection("classes").doc();
    await ref.set({ name, name_lower: name.toLowerCase(), active: true, created_at: FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp() });
    return Response.json({ class: { id: ref.id, name, active: true } }, { status: 201 });
  } catch (error: any) {
    return Response.json({ error: error?.message === "UNAUTHENTICATED" ? "Please sign in." : "Could not add class." }, { status: error?.message === "UNAUTHENTICATED" ? 401 : 403 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);
    const { classId, name, active } = await request.json();
    if (typeof classId !== "string" || !classId) return Response.json({ error: "Select a class." }, { status: 400 });
    const update: Record<string, any> = { updated_at: FieldValue.serverTimestamp() };
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim() || name.trim().length > 40) return Response.json({ error: "Enter a class name of 1–40 characters." }, { status: 400 });
      update.name = name.trim(); update.name_lower = name.trim().toLowerCase();
    }
    if (active !== undefined) update.active = active === true;
    await adminDb().collection("classes").doc(classId).update(update);
    return Response.json({ ok: true });
  } catch (error: any) {
    return Response.json({ error: error?.message === "UNAUTHENTICATED" ? "Please sign in." : "Could not update class." }, { status: error?.message === "UNAUTHENTICATED" ? 401 : 403 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin(request);
    const { classId } = await request.json();
    if (typeof classId !== "string" || !classId) return Response.json({ error: "Select a class." }, { status: 400 });
    const db = adminDb();
    const [teams, applications, registrations] = await Promise.all([
      db.collection("teams").where("class_id", "==", classId).limit(1).get(),
      db.collection("team_applications").where("class_id", "==", classId).limit(1).get(),
      db.collection("round_registrations").where("class_id", "==", classId).limit(1).get(),
    ]);
    if (!teams.empty || !applications.empty || !registrations.empty) return Response.json({ error: "This class is already in use. Deactivate it instead so historical records are preserved." }, { status: 409 });
    await db.collection("classes").doc(classId).delete();
    return Response.json({ ok: true });
  } catch (error: any) {
    return Response.json({ error: error?.message === "UNAUTHENTICATED" ? "Please sign in." : "Could not delete class." }, { status: error?.message === "UNAUTHENTICATED" ? 401 : 403 });
  }
}
