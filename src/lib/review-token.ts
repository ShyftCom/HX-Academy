import { createHmac } from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET ?? "review-secret";

export function signReviewToken(orderId: string, email: string): string {
  const payload = `${orderId}:${email}:${Date.now()}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyReviewToken(token: string, orderId: string): { valid: boolean; email: string } {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(":");
    if (parts.length < 4) return { valid: false, email: "" };
    const [tokenOrderId, email, ts, sig] = [parts[0], parts[1], parts[2], parts[3]];
    if (tokenOrderId !== orderId) return { valid: false, email: "" };
    const age = Date.now() - parseInt(ts);
    if (age > 30 * 24 * 60 * 60 * 1000) return { valid: false, email: "" };
    const payload = `${tokenOrderId}:${email}:${ts}`;
    const expectedSig = createHmac("sha256", SECRET).update(payload).digest("base64url");
    if (sig !== expectedSig) return { valid: false, email: "" };
    return { valid: true, email };
  } catch {
    return { valid: false, email: "" };
  }
}
