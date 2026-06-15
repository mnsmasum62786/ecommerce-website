import { NextResponse } from "next/server";
import { requireAdmin, apiError } from "@/lib/api";
import { uploadImage } from "@/lib/blob";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return apiError("No file provided.", 400);
    }

    const url = await uploadImage(file);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return apiError(message, 500);
  }
}
