/**
 * What a payment proof may be: any raster image, or a PDF.
 *
 * Deliberately an explicit list rather than "image/*". Blob serves files
 * publicly with the content type they were uploaded under, and "image/*"
 * would admit image/svg+xml — which, like HTML, runs script when opened, so
 * a "receipt" could execute in an admin's browser on our Blob domain.
 */
export const PROOF_MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  pjpeg: "image/jpeg",
  png: "image/png",
  apng: "image/apng",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  ico: "image/x-icon",
  jxl: "image/jxl",
  pdf: "application/pdf",
};

export const PROOF_CONTENT_TYPES = Array.from(
  new Set([
    ...Object.values(PROOF_MIME_BY_EXT),
    // Aliases some browsers/OSes report for the same formats.
    "image/jpg",
    "image/pjpeg",
    "image/x-png",
    "image/x-ms-bmp",
    "image/vnd.microsoft.icon",
    "image/heic-sequence",
    "image/heif-sequence",
  ]),
);

/** Value for an <input type="file" accept>. Lists extensions too, for OSes that don't map HEIC etc. */
export const PROOF_ACCEPT = [
  ...new Set(Object.values(PROOF_MIME_BY_EXT)),
  ...Object.keys(PROOF_MIME_BY_EXT).map((e) => `.${e}`),
].join(",");

/**
 * The content type to upload a proof under, or null if it is not an allowed
 * image/PDF. Falls back to the extension when the browser reports no type
 * (common for HEIC), so the upload always carries an explicit, allowed type.
 */
export function proofContentType(file: { name: string; type: string }): string | null {
  const type = file.type.toLowerCase();
  if (type && PROOF_CONTENT_TYPES.includes(type)) return type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  // A declared type that isn't ours (text/html, image/svg+xml…) is refused
  // even if the name was changed to look like an image.
  if (type && type !== "application/octet-stream") return null;
  return PROOF_MIME_BY_EXT[ext] ?? null;
}
