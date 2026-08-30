import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "public";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Vercel caps a serverless function's request body at 4.5MB. Anything
    // larger never reaches this handler — the connection is dropped mid-body,
    // which the browser sees as a request that simply never finishes. Stating
    // the real limit turns a hung spinner into an error the visitor can act on.
    const maxSize = 4 * 1024 * 1024;
    if (file.size > maxSize) return NextResponse.json({ error: "File too large (max 4MB)" }, { status: 413 });

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "bin";
    const filename = `${folder}/${uuidv4()}.${ext}`;

    const blob = await put(filename, file, { access: "public", contentType: file.type });

    return NextResponse.json({ url: blob.url, name: file.name });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
