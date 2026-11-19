import { FieldValue } from "firebase-admin/firestore";
import { adminDb, requireUser } from "@/lib/firebase/admin";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const db = adminDb();
    const [profileSnap, applicationsSnap] = await Promise.all([
      db.collection("profiles").doc(user.uid).get(),
      db.collection("team_applications").where("applicant_id", "==", user.uid).get(),
    ]);

    const applications = applicationsSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => {
        const aTime = a.created_at?.toMillis?.() || 0;
        const bTime = b.created_at?.toMillis?.() || 0;
        return bTime - aTime;
      });

    const latest: any = applications[0] || null;
    if (latest?.created_at?.toDate) latest.created_at = latest.created_at.toDate().toISOString();

    return Response.json({
      role: profileSnap.data()?.role || "driver",
      application: latest,
    });
  } catch (error: any) {
    const unauthenticated = error?.message === "UNAUTHENTICATED";
    return Response.json(
      { error: unauthenticated ? "Please sign in again." : "Could not load your team application." },
      { status: unauthenticated ? 401 : 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const teamName = typeof body?.teamName === "string" ? body.teamName.trim() : "";
    const club = typeof body?.club === "string" ? body.club.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!teamName || teamName.length > 80) {
      return Response.json({ error: "Enter a team name of 1–80 characters." }, { status: 400 });
    }
    if (club.length > 100 || reason.length > 2000) {
      return Response.json({ error: "The club or team description is too long." }, { status: 400 });
    }

    const db = adminDb();
    const profileRef = db.collection("profiles").doc(user.uid);
    const profileSnap = await profileRef.get();
    if (!profileSnap.exists) {
      return Response.json(
        { error: "Your user profile could not be found. Please sign out and back in." },
        { status: 400 },
      );
    }

    const role = profileSnap.data()?.role || "driver";
    if (role !== "driver") {
      return Response.json({ error: "Only driver accounts can apply to register a new team." }, { status: 403 });
    }

    const existing = await db.collection("team_applications").where("applicant_id", "==", user.uid).get();
    const active = existing.docs.find((doc) => ["pending", "approved"].includes(String(doc.data().status)));
    if (active) {
      return Response.json(
        { error: active.data().status === "pending"
          ? "You already have a team application awaiting review."
          : "Your team application has already been approved." },
        { status: 409 },
      );
    }

    const applicationRef = db.collection("team_applications").doc();
    const application = {
      applicant_id: user.uid,
      applicant_name: profileSnap.data()?.name || "",
      applicant_email: user.email || profileSnap.data()?.email || "",
      team_name: teamName,
      club,
      reason,
      status: "pending",
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    };

    await applicationRef.set(application);
    return Response.json({
      application: {
        id: applicationRef.id,
        ...application,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }, { status: 201 });
  } catch (error: any) {
    const unauthenticated = error?.message === "UNAUTHENTICATED";
    return Response.json(
      { error: unauthenticated ? "Please sign in again." : "Could not submit your team application." },
      { status: unauthenticated ? 401 : 500 },
    );
  }
}
