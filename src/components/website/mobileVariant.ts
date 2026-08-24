/**
 * The portrait counterpart of one of our own hero images, or undefined.
 *
 * Hero art is stored twice: `/media/wide/<name>.jpg` at 16:9 for desktop and
 * `/media/mobile/<name>.jpg` at 3:4 for phones. A 16:9 frame in a portrait
 * viewport crops to a thin central band — on the composed portraits that band
 * is mostly the blurred backdrop, with the player cut off at the neck — so the
 * narrow layout needs its own crop rather than a tighter one of the same file.
 *
 * The pairing is by filename, which keeps venue, programme and news heroes
 * working without a second column on each of those tables: they store one URL
 * and the phone crop is derived from it. Every file in `wide/` has a `mobile/`
 * twin, so the mapping is total for our own art — add both or neither.
 *
 * Anything else (an admin upload, a remote URL) returns undefined and the Hero
 * falls back to object-cover on the single image it was given, which is the
 * behaviour those images had before this existed.
 */
const WIDE_PREFIX = "/media/wide/";

export function mobileVariant(url: string | null | undefined): string | undefined {
  if (!url?.startsWith(WIDE_PREFIX)) return undefined;
  return `/media/mobile/${url.slice(WIDE_PREFIX.length)}`;
}
