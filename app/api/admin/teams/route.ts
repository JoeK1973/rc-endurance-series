import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { adminDb, requireAdmin } from "@/lib/firebase/admin";

async function deleteInChunks(refs: DocumentReference[]) {
  const db = adminDb();
  for (let i = 0; i < refs.length; i += 400) {
    const batch = db.batch();
    refs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const db = adminDb();
    const body = await request.json();
    const action = body?.action;
    const teamId = typeof body?.teamId === "string" ? body.teamId.trim() : "";
    if (!teamId) return Response.json({ error: "A team must be selected." }, { status: 400 });

    const teamRef = db.collection("teams").doc(teamId);
    const teamSnap = await teamRef.get();
    if (!teamSnap.exists) return Response.json({ error: "Team not found." }, { status: 404 });

    if (action === "rename") {
      const name = typeof body?.name === "string" ? body.name.trim() : "";
      if (!name || name.length > 80) {
        return Response.json({ error: "Enter a team name of 1–80 characters." }, { status: 400 });
      }
      await teamRef.update({ name, updated_at: FieldValue.serverTimestamp() });
      return Response.json({ ok: true, teamId, name });
    }

    if (action !== "delete") {
      return Response.json({ error: "Unsupported team action." }, { status: 400 });
    }

    const team = teamSnap.data() || {};
    const managerId = typeof team.manager_id === "string" ? team.manager_id : "";
    const conversationsSnap = await db.collection("conversations").where("team_id", "==", teamId).get();
    const conversationIds = conversationsSnap.docs.map((doc) => doc.id);

    const [memberships, requests, shortlists, messageGroups] = await Promise.all([
      db.collection("team_drivers").where("team_id", "==", teamId).get(),
      db.collection("team_driver_requests").where("team_id", "==", teamId).get(),
      db.collection("team_shortlist").where("team_id", "==", teamId).get(),
      Promise.all(conversationIds.map((id) => db.collection("messages").where("conversation_id", "==", id).get())),
    ]);

    const refs: DocumentReference[] = [
      ...memberships.docs.map((doc) => doc.ref),
      ...requests.docs.map((doc) => doc.ref),
      ...shortlists.docs.map((doc) => doc.ref),
      ...conversationsSnap.docs.map((doc) => doc.ref),
      ...messageGroups.flatMap((group) => group.docs.map((doc) => doc.ref)),
      teamRef,
    ];

    // Keep the approved application as an audit record, but mark it so the
    // former manager can submit a fresh application in the future.
    const applicationRef = db.collection("team_applications").doc(teamId);
    const applicationSnap = await applicationRef.get();

    let managerRoleReverted = false;
    let managerRef: DocumentReference | null = null;
    if (managerId) {
      managerRef = db.collection("profiles").doc(managerId);
      const [managerSnap, otherTeamsSnap] = await Promise.all([
        managerRef.get(),
        db.collection("teams").where("manager_id", "==", managerId).get(),
      ]);
      const hasOtherTeams = otherTeamsSnap.docs.some((doc) => doc.id !== teamId);
      managerRoleReverted = Boolean(
        managerSnap.exists && managerSnap.data()?.role === "team_manager" && !hasOtherTeams
      );
    }

    // Remove memberships, invitations, conversations and messages first. Keep
    // the team document until the final batch so the manager/application updates
    // and team deletion happen together.
    await deleteInChunks(refs.filter((ref) => ref.path !== teamRef.path));

    const finalBatch = db.batch();
    finalBatch.delete(teamRef);
    if (applicationSnap.exists) {
      finalBatch.update(applicationRef, {
        status: "team_deleted",
        team_deleted_at: FieldValue.serverTimestamp(),
      });
    }
    if (managerRoleReverted && managerRef) {
      finalBatch.update(managerRef, {
        role: "driver",
        team_manager_application_id: FieldValue.delete(),
        updated_at: FieldValue.serverTimestamp(),
      });
    }
    await finalBatch.commit();

    return Response.json({
      ok: true,
      teamId,
      deletedRelatedRecords: refs.length - 1,
      managerRoleReverted,
      registrationsPreserved: true,
    });
  } catch (error: any) {
    const message = error?.message;
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return Response.json({
      error: status === 401 ? "Please sign in." : status === 403 ? "Only an admin can manage teams." : "Could not complete the team operation.",
    }, { status });
  }
}
