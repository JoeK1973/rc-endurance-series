import { FieldValue } from "firebase-admin/firestore";
import { adminDb, requireAdmin } from "@/lib/firebase/admin";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const snap = await adminDb().collection("team_applications").get();
    const applications = snap.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate?.().toISOString() || null,
          updated_at: data.updated_at?.toDate?.().toISOString() || null,
        };
      })
      .sort((a: any, b: any) => String(b.created_at || "").localeCompare(String(a.created_at || "")));

    return Response.json({ applications });
  } catch (error: any) {
    const unauthenticated = error?.message === "UNAUTHENTICATED";
    return Response.json(
      { error: unauthenticated ? "Please sign in." : "Admin access required." },
      { status: unauthenticated ? 401 : 403 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const applicationId = typeof body?.applicationId === "string" ? body.applicationId.trim() : "";
    const action = body?.action;
    const adminNote = typeof body?.adminNote === "string" ? body.adminNote.trim().slice(0, 500) : "";

    if (!applicationId || !["approve", "reject"].includes(action)) {
      return Response.json({ error: "Choose an application and a valid action." }, { status: 400 });
    }

    const db = adminDb();
    const applicationRef = db.collection("team_applications").doc(applicationId);
    const result = await db.runTransaction(async (transaction) => {
      const applicationSnap = await transaction.get(applicationRef);
      if (!applicationSnap.exists) throw new Error("APPLICATION_NOT_FOUND");
      const application = applicationSnap.data()!;
      if (application.status !== "pending") throw new Error("APPLICATION_NOT_PENDING");

      if (action === "reject") {
        transaction.update(applicationRef, {
          status: "rejected",
          admin_note: adminNote,
          reviewed_by: admin.uid,
          reviewed_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        });
        return { status: "rejected" };
      }

      const applicantId = String(application.applicant_id || "");
      if (!applicantId) throw new Error("APPLICATION_INVALID");

      const profileRef = db.collection("profiles").doc(applicantId);
      // The approved team uses the application ID as its document ID. This
      // matches the existing admin team-deletion/audit-record convention.
      const teamRef = db.collection("teams").doc(applicationId);
      const [profileSnap, teamSnap] = await Promise.all([
        transaction.get(profileRef),
        transaction.get(teamRef),
      ]);

      if (!profileSnap.exists || (profileSnap.data()?.role || "driver") !== "driver") {
        throw new Error("APPLICANT_NOT_ELIGIBLE");
      }
      if (teamSnap.exists) throw new Error("TEAM_ALREADY_EXISTS");

      transaction.update(applicationRef, {
        status: "approved",
        admin_note: adminNote,
        reviewed_by: admin.uid,
        reviewed_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });
      transaction.update(profileRef, {
        role: "team_manager",
        team_manager_application_id: applicationId,
        updated_at: FieldValue.serverTimestamp(),
      });
      transaction.create(teamRef, {
        id: applicationId,
        application_id: applicationId,
        manager_id: applicantId,
        name: application.team_name,
        club: application.club || "",
        looking_for_drivers: true,
        created_at: FieldValue.serverTimestamp(),
      });

      return { status: "approved", teamId: applicationId };
    });

    return Response.json({ ok: true, ...result });
  } catch (error: any) {
    const message = error?.message;
    const status = message === "UNAUTHENTICATED" ? 401
      : message === "FORBIDDEN" ? 403
      : message === "APPLICATION_NOT_FOUND" ? 404
      : ["APPLICATION_NOT_PENDING", "APPLICANT_NOT_ELIGIBLE", "TEAM_ALREADY_EXISTS"].includes(message) ? 409
      : 500;

    const publicMessage: Record<string, string> = {
      UNAUTHENTICATED: "Please sign in.",
      FORBIDDEN: "Admin access required.",
      APPLICATION_NOT_FOUND: "Application not found.",
      APPLICATION_NOT_PENDING: "This application has already been reviewed.",
      APPLICANT_NOT_ELIGIBLE: "The applicant is no longer eligible to become a team manager.",
      TEAM_ALREADY_EXISTS: "A team already exists for this application.",
    };

    return Response.json(
      { error: publicMessage[message] || "Could not review the team application." },
      { status },
    );
  }
}
