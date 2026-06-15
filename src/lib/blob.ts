import { put } from "@vercel/blob";

/**
 * Upload a file to Vercel Blob and return its public URL.
 * Requires BLOB_READ_WRITE_TOKEN to be set in the environment.
 */
export async function uploadImage(file: File, folder = "products"): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Image storage is not configured (missing BLOB_READ_WRITE_TOKEN).");
  }
  const ext = file.name.split(".").pop() || "jpg";
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const blob = await put(key, file, { access: "public" });
  return blob.url;
}
