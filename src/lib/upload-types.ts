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

/**
 * The real type of a proof, read from its first bytes rather than trusting
 * the name or the declared type — so an HTML or SVG file renamed to
 * "receipt.jpg" is still refused. Null when it is not an image/PDF we accept.
 */
export function sniffProofType(bytes: Uint8Array): string | null {
  const b = bytes;
  const ascii = (start: number, len: number) => String.fromCharCode(...b.subarray(start, start + len));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && ascii(1, 3) === "PNG") return "image/png";
  if (ascii(0, 4) === "GIF8") return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  if (ascii(0, 5) === "%PDF-") return "application/pdf";
  if (ascii(0, 2) === "BM") return "image/bmp";
  if (ascii(0, 4) === "II*\0" || ascii(0, 4) === "MM\0*") return "image/tiff";
  if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return "image/x-icon";
  if (ascii(4, 4) === "ftyp") {
    const brand = ascii(8, 4);
    if (brand === "avif" || brand === "avis") return "image/avif";
    if (["heic", "heix", "hevc", "hevx", "heim", "heis"].includes(brand)) return "image/heic";
    if (["mif1", "msf1"].includes(brand)) return "image/heif";
  }
  if ((b[0] === 0xff && b[1] === 0x0a) || ascii(4, 8) === "JXL \r\n\x87\n") return "image/jxl";
  return null;
}
