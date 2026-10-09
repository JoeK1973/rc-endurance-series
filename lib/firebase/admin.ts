import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let adminApp: App;
function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured on the server.");
  const serviceAccount = JSON.parse(raw);
  adminApp = initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: String(serviceAccount.private_key).replace(/\\n/g, "\n"),
    }),
    projectId: serviceAccount.project_id,
  });
  return adminApp;
}

export function adminDb() {
  return getFirestore(getAdminApp());
}

export async function requireUser(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) throw new Error("UNAUTHENTICATED");
  const token = header.slice(7);
  const decoded = await getAuth(getAdminApp()).verifyIdToken(token, true);
  return { uid: decoded.uid, email: decoded.email || "" };
}

export async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  const profile = await adminDb().collection("profiles").doc(user.uid).get();
  const role = profile.data()?.role;
  if (role !== "admin" && role !== "superuser") throw new Error("FORBIDDEN");
  return { ...user, role };
}
