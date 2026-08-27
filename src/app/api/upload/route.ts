import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

/**
 * Upload deliberately stays session-only rather than taking a permission.
 * Players use it for payment receipts and their profile photo, so gating it
 * would break both. It was already the best-defended route in this sweep: a
 * 10MB cap, a MIME allow-list, a UUID filename that cannot collide with or
 * overwrite anything, and an uploadedBy audit column.
 *
 * The gap was `folder`, which came straight from the form and was interpolated
 * into the blob key. Nothing constrained its shape, so a caller could push
 * "../" segments or arbitrary junk into the key namespace that the media
 * library browses by folder.
 *
 * A shape check rather than a fixed list of names: every folder the app uses
 * today is a single lowercase segment, and a new feature adding its own should
 * not have to edit this file to upload. What is refused is a value that is not
 * one plain segment.
 */
const FOLDER_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "general";
    if (!FOLDER_PATTERN.test(folder)) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });

    const allowedTypes = [
      "image/jpeg", "image/png", "image/webp", "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "video/mp4", "video/webm",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed. Supported: JPG, PNG, PDF, DOCX, XLSX, MP4" }, { status: 400 });
    }

    // The extension came off the caller's own filename, so the stored key
    // could end in anything — ".html" on a file served as image/png, for
    // instance. It is only ever cosmetic here, since the blob is served with
    // the contentType checked above, so it is simply constrained to something
    // extension-shaped.
    const rawExt = file.name.split(".").pop() ?? "";
    const ext = /^[a-zA-Z0-9]{1,8}$/.test(rawExt) ? rawExt.toLowerCase() : "bin";
    const filename = `${folder}/${uuidv4()}.${ext}`;

    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
    });

    const mediaFile = await db.mediaFile.create({
      data: {
        name: filename,
        originalName: file.name,
        url: blob.url,
        mimeType: file.type,
        size: file.size,
        folder,
        uploadedBy: session.user.id,
      },
    });

    return NextResponse.json({ url: blob.url, id: mediaFile.id, name: file.name });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
