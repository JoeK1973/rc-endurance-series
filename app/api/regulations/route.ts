export const dynamic = "force-dynamic";

import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { adminDb, requireAdmin } from "@/lib/firebase/admin";

function cleanRegulation(id: string, data: DocumentData) {
  return { id, name: String(data.name || ""), url: String(data.url || "") };
}

export async function GET() {
  try {
    const snapshot = await adminDb().collection("regulations").get();
    const regulations = snapshot.docs
      .map(doc => cleanRegulation(doc.id, doc.data()))
      .filter(item => item.name && item.url)
      .sort((a, b) => a.name.localeCompare(b.name));
    return Response.json({ regulations }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not load regulation links." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const db = adminDb();
    const body = await request.json();
    const action = body?.action;

    if (action === "create" || action === "update") {
      const name = typeof body?.name === "string" ? body.name.trim() : "";
      const url = typeof body?.url === "string" ? body.url.trim() : "";
      if (!name || name.length > 100) return Response.json({ error: "Enter a document name of 1–100 characters." }, { status: 400 });
      let parsed: URL;
      try { parsed = new URL(url); } catch { return Response.json({ error: "Enter a valid document URL." }, { status: 400 }); }
      if (!(["https:", "http:"].includes(parsed.protocol))) return Response.json({ error: "The URL must start with http:// or https://." }, { status: 400 });

      if (action === "create") {
        const ref = db.collection("regulations").doc();
        await ref.set({ name, url, created_at: FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp() });
        return Response.json({ ok: true, regulation: { id: ref.id, name, url } });
      }
      const id = typeof body?.id === "string" ? body.id.trim() : "";
      if (!id) return Response.json({ error: "A regulation link must be selected." }, { status: 400 });
      const ref = db.collection("regulations").doc(id);
      if (!(await ref.get()).exists) return Response.json({ error: "Regulation link not found." }, { status: 404 });
      await ref.update({ name, url, updated_at: FieldValue.serverTimestamp() });
      return Response.json({ ok: true, regulation: { id, name, url } });
    }

    if (action === "delete") {
      const id = typeof body?.id === "string" ? body.id.trim() : "";
      if (!id) return Response.json({ error: "A regulation link must be selected." }, { status: 400 });
      await db.collection("regulations").doc(id).delete();
      return Response.json({ ok: true, id });
    }

    return Response.json({ error: "Unsupported regulation action." }, { status: 400 });
  } catch (error: any) {
    const message = error?.message;
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return Response.json({ error: status === 401 ? "Please sign in." : status === 403 ? "Only an admin can manage regulations." : "Could not complete the regulation operation." }, { status });
  }
}
