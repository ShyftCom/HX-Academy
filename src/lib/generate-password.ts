/**
 * Readable one-time password for an account an admin creates on someone's
 * behalf. The alphabet drops 0/O/1/l/I so the credential survives being read
 * out over the phone or copied off a screen.
 *
 * Isomorphic: Web Crypto is available in the browser and in the Node runtime
 * the API routes run on.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generatePassword(length = 12): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  // Modulo bias across 55 symbols is negligible for a password meant to be
  // changed on first login.
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
