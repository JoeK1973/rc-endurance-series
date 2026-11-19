import { adminDb, requireUser } from "@/lib/firebase/admin";

// Return the active championship classes to signed-in team managers.
// Use the Admin SDK so the team portal does not depend on client-side
// Firestore query permissions for the classes collection.
export async function GET(request: Request) {
  try {
    await requireUser(request);
    const snapshot = await adminDb().collection("classes").where("active", "==", true).get();
    const classes = snapshot.docs
      .map((item) => ({ id: item.id, name: String(item.data().name || "") }))
      .filter((item) => item.name)
      .sort((a, b) => a.name.localeCompare(b.name));
    return Response.json({ classes }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    const unauthenticated = error?.message === "UNAUTHENTICATED";
    return Response.json(
      { error: unauthenticated ? "Please sign in again." : "Could not load racing classes." },
      { status: unauthenticated ? 401 : 500 },
    );
  }
}
