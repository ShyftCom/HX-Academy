"use client";

import { upload } from "@vercel/blob/client";

export interface UploadedBlob {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface UploadOptions {
  /** Destination folder; must be one the token route allows. */
  folder: string;
  /** Size ceiling for this particular upload, from the file requirement. */
  maxSizeMb?: number;
  onProgress?: (percentage: number) => void;
  signal?: AbortSignal;
}

/** Files above this go up in parallel parts, with per-part retries. */
const MULTIPART_THRESHOLD = 5 * 1024 * 1024;

/** Keeps a stray "../" or a query string out of the blob pathname. */
function safeName(name: string) {
  const base = name.split(/[\\/]/).pop() ?? "file";
  return base.replace(/[^\w.\- ]+/g, "_").slice(-120) || "file";
}

/**
 * Uploads a file straight from the browser to Blob storage.
 *
 * The old flow POSTed the file to a route handler, which is capped at 4.5 MB
 * of request body on Vercel — anything larger stalled with no response at all.
 * Going direct removes both that cap and the function timeout.
 *
 * Rejects with a message fit to show the user.
 */
export async function uploadFile(file: File, options: UploadOptions): Promise<UploadedBlob> {
  const { folder, maxSizeMb, onProgress, signal } = options;

  if (maxSizeMb && file.size > maxSizeMb * 1024 * 1024) {
    throw new Error(`File is too large (max ${maxSizeMb} MB)`);
  }

  const blob = await upload(`${folder}/${safeName(file.name)}`, file, {
    access: "public",
    handleUploadUrl: "/api/upload/token",
    clientPayload: JSON.stringify({ folder, maxSizeMb }),
    contentType: file.type || undefined,
    multipart: file.size > MULTIPART_THRESHOLD,
    abortSignal: signal,
    onUploadProgress: onProgress ? ({ percentage }) => onProgress(percentage) : undefined,
  });

  return {
    url: blob.url,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
  };
}
