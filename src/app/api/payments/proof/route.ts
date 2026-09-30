import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sniffProofType } from "@/lib/upload-types";

/**
 * Stores a payment proof in the database and returns the URL to save on the
 * payment. Session-only, like /api/upload: players upload their own receipts
 * and staff upload on a player's behalf.
 *
 * Vercel caps a function's request body at 4.5MB, so that is the real ceiling
 * here; the browser shrinks photos to JPEG well below it before sending.
 */
const MAX_BYTES = 4 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp",
  "application/pdf": "pdf", "image/bmp": "bmp", "image/tiff": "tiff", "image/x-icon": "ico",
  "image/avif": "avif", "image/heic": "heic", "image/heif": "heif", "image/jxl": "jxl",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size === 0) return NextResponse.json({ error: "The file is empty" }, { status: 400 });
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File is too large (max 4 MB). Try a photo or screenshot instead." }, { status: 413 });
    }

    const data = new Uint8Array(await file.arrayBuffer());
    // Typed by content, not by name or declared type.
    const mimeType = sniffProofType(data);
    if (!mimeType) return NextResponse.json({ error: "Only images or PDF files are accepted" }, { status: 400 });

    const base = (file.name.split(/[\\/]/).pop() ?? "proof").replace(/\.[^.]*$/, "").replace(/[^\w\- ]+/g, "_").slice(0, 80) || "proof";
    const fileName = `${base}.${EXT_BY_TYPE[mimeType]}`;

    const stored = await db.paymentProofFile.create({
      data: { data, mimeType, fileName, size: data.length, uploadedBy: session.user.id },
      select: { id: true },
    });

    // The file name rides along in the query so the admin viewer can tell a
    // PDF from an image by the URL alone.
    return NextResponse.json({ url: `/api/payments/proof/${stored.id}?name=${encodeURIComponent(fileName)}`, mimeType, fileName });
  } catch (error) {
    console.error("payment proof upload failed", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
