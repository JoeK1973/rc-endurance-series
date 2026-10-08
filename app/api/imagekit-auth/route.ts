import { createHmac, randomUUID } from "crypto";

function stringField(fields: Record<string, any> | undefined, name: string) {
  return fields?.[name]?.stringValue ?? null;
}

function getUidFromToken(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    );
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

async function firestoreGet(projectId: string, path: string, token: string) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );

  if (!response.ok) return null;
  return response.json();
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";

    const teamId = new URL(request.url).searchParams.get("teamId") || "";
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;

    if (!token || !teamId) {
      return Response.json(
        { error: "Authentication and team are required." },
        { status: 401 }
      );
    }

    if (!projectId || !publicKey || !privateKey) {
      return Response.json(
        { error: "Image upload service is not configured." },
        { status: 500 }
      );
    }

    const uid = getUidFromToken(token);
    if (!uid) {
      return Response.json(
        { error: "Invalid authentication token." },
        { status: 401 }
      );
    }

    // These reads are authenticated by Firebase itself. If the Firebase ID
    // token is invalid, Firestore rejects the request.
    const teamDocument = await firestoreGet(
      projectId,
      `teams/${encodeURIComponent(teamId)}`,
      token
    );

    if (!teamDocument?.fields) {
      return Response.json({ error: "Team not found." }, { status: 404 });
    }

    const managerId = stringField(teamDocument.fields, "manager_id");

    const profileDocument = await firestoreGet(
      projectId,
      `profiles/${encodeURIComponent(uid)}`,
      token
    );

    const role =
      stringField(profileDocument?.fields, "role") || "driver";

    if (
      managerId !== uid &&
      role !== "admin" &&
      role !== "superuser"
    ) {
      return Response.json(
        { error: "You do not have permission to upload for this team." },
        { status: 403 }
      );
    }

    const tokenValue = randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 1800;
    const signature = createHmac("sha1", privateKey)
      .update(tokenValue + expire)
      .digest("hex");

    return Response.json({
      token: tokenValue,
      expire,
      signature,
      publicKey,
    });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Could not prepare image upload." },
      { status: 500 }
    );
  }
}
