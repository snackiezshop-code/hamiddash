import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma generates its client (and native query engine) into src/generated/prisma,
  // which Next's file tracing misses — ship the engine with every server route.
  outputFileTracingIncludes: {
    "/**": ["./src/generated/prisma/**/*.node"],
  },
};

export default nextConfig;
