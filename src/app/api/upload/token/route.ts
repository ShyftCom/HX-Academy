import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";

/**
 * Token issuer for browser → Blob uploads.
 *
 * Files used to be POSTed to /api/upload, which read the whole body into the
 * function and re-uploaded it with put(). That path is capped at 4.5 MB of
 * request body on Vercel, so a phone photo of an ID card — routinely 5–10 MB,
 * and the file requirements advertise limits of 50 and 100 MB — died mid-body
 * with the connection dropped rather than a response, which is why the
 * spinner in the upload box never stopped turning.
 *
 * The browser now uploads straight to Blob storage and this route only signs
 * the upload. Nothing large passes through the function, so neither the body
 * limit nor the function timeout applies.
 */

/** Folders a signed upload may write into. The client picks one; nothing else is accepted. */
const ALLOWED_FOLDERS = new Set([
  "applications",
  "documents",
  "payments",
  "profile",
  "players",
  "general",
  "products",
  "website",
  "files",
]);

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "video/mp4", "video/webm",
];

/** Hard ceiling, whatever a file requirement asks for. */
const MAX_BYTES = 100 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request: req,
      // Auth lives here, not at the top of the handler: handleUpload also
      // serves Blob's own server-to-server completion callback, which carries
      // no session and would be rejected by a blanket check.
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");

        const folder = pathname.split("/")[0];
        if (!ALLOWED_FOLDERS.has(folder)) throw new Error("Unsupported upload folder");

        let requested = MAX_BYTES;
        try {
          const parsed = JSON.parse(clientPayload ?? "{}") as { maxSizeMb?: number };
          if (parsed.maxSizeMb && parsed.maxSizeMb > 0) requested = parsed.maxSizeMb * 1024 * 1024;
        } catch {
          /* an unreadable payload just means the default ceiling applies */
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: Math.min(requested, MAX_BYTES),
          // Two players uploading "cni.jpg" must not overwrite each other.
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.user.id, folder }),
        };
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload could not be authorised";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}
