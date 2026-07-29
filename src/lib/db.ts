import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";

/** A local/self-hosted Postgres URL, as opposed to a Neon serverless endpoint. */
export function isLocalPostgresUrl(url: string): boolean {
  return /^postgres(ql)?:\/\/[^/@]*@?(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
}

/**
 * Neon's serverless driver talks to Neon over WebSocket and cannot reach a
 * plain Postgres server, which makes it impossible to run or verify this app
 * without a live Neon instance. Local URLs therefore use node-postgres instead.
 *
 * Any non-local URL — i.e. production, which is a *.neon.tech endpoint — takes
 * exactly the same PrismaNeon path it always has.
 */
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!;
  const adapter = isLocalPostgresUrl(connectionString)
    ? new PrismaPg({ connectionString })
    : new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
