import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// pg already treats sslmode=require as verify-full; saying so explicitly silences its deprecation warning.
function connectionString() {
  return process.env.DATABASE_URL?.replace(/sslmode=(require|prefer|verify-ca)\b/, "sslmode=verify-full");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString() }) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
