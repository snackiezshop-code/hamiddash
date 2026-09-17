import path from "node:path";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma CLI resolves relative SQLite paths from prisma/, but the bundled runtime doesn't — pin it to the same file.
function datasourceUrl() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  if (!url.startsWith("file:./")) return url;
  return "file:" + path.join(process.cwd(), "prisma", url.slice("file:./".length));
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: datasourceUrl() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
