"use client";

import { proofContentType } from "@/lib/upload-types";

/** Stay clear of the 4MB server cap (itself under Vercel's 4.5MB body limit). */
const TARGET_BYTES = 3.5 * 1024 * 1024;
const MAX_DIMENSION = 2400;
/** Formats most browsers can't display, so an admin could not preview them. */
const CONVERT_TYPES = new Set(["image/heic", "image/heif", "image/tiff", "image/bmp", "image/jxl"]);

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/** Re-encodes an image as JPEG under TARGET_BYTES, or returns null if the browser can't decode it. */
async function toJpeg(file: File): Promise<File | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null; // e.g. HEIC in Chrome/Firefox
  }

  let scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const name = file.name.replace(/\.[^.]*$/, "") + ".jpg";
  try {
    for (let attempt = 0; attempt < 6; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      // JPEG has no transparency; a transparent PNG would otherwise go black.
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await canvasToJpeg(canvas, attempt < 2 ? 0.85 : 0.75);
      if (blob && blob.size <= TARGET_BYTES) return new File([blob], name, { type: "image/jpeg" });
      scale *= 0.75;
    }
    return null;
  } finally {
    bitmap.close();
  }
}

/**
 * Uploads a payment proof into the database and returns the URL to save on
 * the payment. Rejects with a message fit to show the user.
 */
export async function uploadPaymentProof(file: File): Promise<string> {
  const type = proofContentType(file);
  if (!type) throw new Error("Only images or PDF files are accepted");

  let toSend: File = file;
  if (type !== "application/pdf" && (file.size > TARGET_BYTES || CONVERT_TYPES.has(type))) {
    const jpeg = await toJpeg(file);
    if (jpeg) toSend = jpeg;
    else if (file.size > TARGET_BYTES) {
      throw new Error("This photo is too large and couldn't be compressed. Please upload a JPEG or a screenshot instead.");
    }
  }
  if (toSend.size > TARGET_BYTES) {
    throw new Error("File is too large (max 3.5 MB). Please upload a smaller PDF or a photo instead.");
  }

  const fd = new FormData();
  fd.append("file", toSend);
  let res: Response;
  try {
    res = await fetch("/api/payments/proof", { method: "POST", body: fd });
  } catch {
    throw new Error("Network error. Please try again.");
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) throw new Error(json.error ?? `Upload failed (HTTP ${res.status})`);
  return json.url as string;
}
