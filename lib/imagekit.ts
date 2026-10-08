import { auth } from "@/lib/firebase/client";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

export type ImageKitUploadResult = {
  url: string;
  thumbnailUrl: string;
  fileName: string;
  fileId?: string;
};

export async function uploadImageToImageKit(
  file: File,
  teamId: string
): Promise<ImageKitUploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Only JPG, JPEG and PNG images can be uploaded.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Images must be 5 MB or smaller.");
  }

  const user = auth.currentUser;
  if (!user) throw new Error("You must be signed in to upload an image.");

  const idToken = await user.getIdToken();

  const authResponse = await fetch(
    `/api/imagekit-auth?teamId=${encodeURIComponent(teamId)}`,
    {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: "no-store",
    }
  );

  const authData = await authResponse.json();
  if (!authResponse.ok) {
    throw new Error(
      authData.error || "Could not authenticate image upload."
    );
  }

  const safeName =
    file.name.replace(/[^a-zA-Z0-9._-]/g, "_") ||
    "bodyshell-image.jpg";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", safeName);
  formData.append("token", authData.token);
  formData.append("signature", authData.signature);
  formData.append("expire", String(authData.expire));
  formData.append("publicKey", authData.publicKey);
  formData.append("folder", `/rc-endurance/bodyshells/${teamId}`);
  formData.append("useUniqueFileName", "true");

  const uploadResponse = await fetch(
    "https://upload.imagekit.io/api/v1/files/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  const uploadData = await uploadResponse.json();

  if (!uploadResponse.ok || !uploadData.url) {
    throw new Error(uploadData.message || "Image upload failed.");
  }

  const thumbnailUrl =
    `${uploadData.url}${uploadData.url.includes("?") ? "&" : "?"}` +
    "tr=w-300,h-300";

  return {
    url: uploadData.url,
    thumbnailUrl,
    fileName: uploadData.name || safeName,
    fileId: uploadData.fileId,
  };
}
